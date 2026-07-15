/**
 * @cursor-change: 2026-05-20, v1.0.0, news/gamecontents 도메인용 3-tier 베이스 매니저
 *
 * design.md §"CacheManager 구조" / §"SWR / 점검 응답 감지" 의 베이스 클래스.
 *
 * - L1 (in-memory Map) → L2 (Redis) → L3 (PostgreSQL domain_cache) → L4 (API fetcher)
 * - L3 hit 이 soft 만료 이전이면 fresh, soft~hard 사이면 stale 후보
 * - fetcher 실패가 maintenance 패턴이고 stale 후보가 있으면 stale 반환 + cache.stale=true
 * - stale 후보도 없으면 MaintenanceUnavailableError 던짐 (server.ts 가 503 + Retry-After)
 *
 * armories CacheManager 와는 독립적인 도메인 — character 전용 syncToMemoryCache 같은
 * NormalizedCharacterDetail 강결합 메서드를 피하기 위해 별도 베이스로 분기 (DP-7).
 */

import { logger } from '@lostark/shared';

import {
  DatabaseDomainCache,
  DomainCacheRow,
  DomainCacheType,
} from './database-domain-cache.js';
import { RedisDomainCache } from './redis-domain-cache.js';

// === 공개 타입 ===

/**
 * 도메인별 4-단 TTL 정책. 모두 초 단위.
 */
export interface CacheTierTtl {
  /** L1 in-memory TTL (초). */
  l1Seconds: number;
  /** L2 Redis TTL (초). */
  l2Seconds: number;
  /** L3 fresh window — 이 시점 이후엔 재조회 트리거 (초). */
  l3SoftSeconds: number;
  /** L3 stale 절대 만료 — 이 시점 이후엔 stale 도 거부 (초). */
  l3HardSeconds: number;
}

/**
 * `fetchWithFallback` 결과. server.ts envelope 의 `cache` 필드에 그대로 매핑된다.
 */
export interface CacheLookupResult<T> {
  data: T;
  source: 'memory' | 'redis' | 'database' | 'database-stale' | 'api';
  stale: boolean;
  /** stale 일 때만 채워진다 (원본 API 응답 시각 기준). */
  staleAgeSeconds?: number;
}

/**
 * `forceRefresh` 결과. 스케줄러(calendar-refresh-scheduler.ts)가 재시도 루프의
 * 조기 종료/지속 판단에 사용한다.
 *
 * - `refreshed`         : fetcher 성공 → L1/L2/L3 전체 교체됨 (staleAge 0 리셋). 창 조기 종료.
 * - `maintenance-skip`  : 점검(isMaintenanceError) 매칭 → **기존 캐시 무변경**. 재시도 지속.
 * - `error`             : 그 외 에러 → **기존 캐시 무변경**. 로그 후 재시도 지속.
 * - `skipped-in-flight` : 스케줄러 inFlight 가드가 재진입을 막음 (base forceRefresh 는 반환 안 함).
 */
export interface CacheRefreshOutcome {
  outcome: 'refreshed' | 'maintenance-skip' | 'error' | 'skipped-in-flight';
  /** outcome==='error' 일 때만 채움 — 로그/테스트 assertion 용. */
  error?: string;
}

/**
 * 점검 + stale fallback 도 실패한 상태. server.ts 가 503 + `Retry-After: 60` 으로 변환.
 */
export class MaintenanceUnavailableError extends Error {
  constructor(public readonly cacheKey: string, public readonly cause: unknown) {
    super(`Upstream maintenance and no stale fallback available for ${cacheKey}`);
    this.name = 'MaintenanceUnavailableError';
  }
}

// === 내부 메모리 엔트리 ===

interface MemoryEntry<T> {
  payload: T;
  normalizedAt: number; // epoch ms
}

// === 베이스 매니저 ===

export abstract class DomainCacheManager<T> {
  /** PostgreSQL `cache_type_enum` 의 어느 값에 속하는지. 서브클래스가 결정. */
  protected abstract readonly cacheType: DomainCacheType;

  /**
   * 메모리 캐시. 키는 도메인 매니저가 직접 빌드 (예: `news:notices:default:v1`).
   * Redis/PG 와 동일 키스페이스 사용 — 다중 매니저 간 충돌 방지.
   */
  protected memory = new Map<string, MemoryEntry<T>>();

  /** 메모리 cap. 단순 size 한계 (LRU 미구현). 초과 시 가장 오래된 normalizedAt 항목 evict. */
  protected readonly memoryMaxEntries: number = 100;

  constructor(
    protected readonly ttl: CacheTierTtl,
    protected readonly redis: RedisDomainCache,
    protected readonly db: DatabaseDomainCache,
  ) {}

  /**
   * 3-tier 조회 + SWR fallback.
   *
   * 흐름은 design.md §"플로우 - 정상 경로" 와 §"fetchWithFallback 의사코드" 그대로.
   */
  async fetchWithFallback(
    cacheKey: string,
    fetcher: () => Promise<T>,
  ): Promise<CacheLookupResult<T>> {
    // 1) L1 (in-memory)
    const memEntry = this.memory.get(cacheKey);
    if (memEntry && Date.now() - memEntry.normalizedAt <= this.ttl.l1Seconds * 1000) {
      logger.debug({ cacheType: this.cacheType, cacheKey }, 'DomainCacheManager: L1 hit');
      return { data: memEntry.payload, source: 'memory', stale: false };
    }
    if (memEntry) {
      // soft expired in L1 — evict 후 진행
      this.memory.delete(cacheKey);
    }

    // 2) L2 (Redis)
    if (this.redis.isConnected()) {
      const redisHit = await this.redis.get<T>(cacheKey);
      if (redisHit !== null) {
        this.upsertMemory(cacheKey, redisHit);
        logger.debug({ cacheType: this.cacheType, cacheKey }, 'DomainCacheManager: L2 hit');
        return { data: redisHit, source: 'redis', stale: false };
      }
    } else {
      logger.debug(
        { cacheType: this.cacheType, cacheKey },
        'DomainCacheManager: Redis not connected, skipping L2',
      );
    }

    // 3) L3 (PostgreSQL) — fresh 우선, stale 은 fetcher 실패 분기에 사용.
    let staleRow: DomainCacheRow<T> | null = null;
    if (this.db.isConnected()) {
      const dbRow = await this.db.getRow<T>(this.cacheType, cacheKey);
      if (dbRow) {
        if (dbRow.softExpiresAt.getTime() > Date.now()) {
          // L3 fresh — L1/L2 동기화 후 반환.
          await this.syncToUpper(cacheKey, dbRow.payload);
          logger.debug(
            { cacheType: this.cacheType, cacheKey },
            'DomainCacheManager: L3 fresh hit',
          );
          return { data: dbRow.payload, source: 'database', stale: false };
        }
        // soft 만료 + hard alive → stale 후보
        staleRow = dbRow;
      }
    } else {
      logger.warn(
        { cacheType: this.cacheType, cacheKey },
        'DomainCacheManager: PostgreSQL not connected, skipping L3',
      );
    }

    // 4) L4 (API fetcher) + 5) SWR fallback
    try {
      const fresh = await fetcher();
      await this.setAllTiers(cacheKey, fresh);
      logger.debug(
        { cacheType: this.cacheType, cacheKey },
        'DomainCacheManager: API fetched, all tiers populated',
      );
      return { data: fresh, source: 'api', stale: false };
    } catch (err) {
      const isMaintenance = this.isMaintenanceError(err);

      if (isMaintenance && staleRow) {
        const ageMs = Date.now() - staleRow.sourceFetchedAt.getTime();
        const staleAgeSeconds = Math.max(0, Math.round(ageMs / 1000));
        logger.warn(
          {
            cacheType: this.cacheType,
            cacheKey,
            staleAgeSeconds,
            err: err instanceof Error ? err.message : String(err),
          },
          'DomainCacheManager: SWR fallback — returning stale L3 row',
        );
        return {
          data: staleRow.payload,
          source: 'database-stale',
          stale: true,
          staleAgeSeconds,
        };
      }

      if (isMaintenance) {
        logger.error(
          {
            cacheType: this.cacheType,
            cacheKey,
            err: err instanceof Error ? err.message : String(err),
          },
          'DomainCacheManager: maintenance detected with no stale fallback',
        );
        throw new MaintenanceUnavailableError(cacheKey, err);
      }

      // 그 외 (4xx 등) — 점검 아님. 즉시 전파.
      throw err;
    }
  }

  /**
   * TTL 무시하고 즉시 강제 refetch. **성공했을 때만** L1/L2/L3 를 교체하고,
   * 실패(점검 포함)하면 기존 캐시(및 SWR stale fallback 경로)를 절대 건드리지
   * 않는다 — `fetchWithFallback`(사용자 요청 경로)과는 별개의 스케줄러 전용
   * 진입점 (ADR-0004 결정2: `invalidate()+refetch` 의 self-inflicted outage 회피).
   *
   * 3분기:
   * - 성공 → `setAllTiers`(L1/L2/L3 전체 교체, sourceFetchedAt=now 로 staleAge 0 리셋) → `refreshed`
   * - 점검(`isMaintenanceError`) → 아무 것도 건드리지 않고 `maintenance-skip`
   * - 그 외 에러 → 아무 것도 건드리지 않고 `error`(메시지 첨부)
   */
  async forceRefresh(
    cacheKey: string,
    fetcher: () => Promise<T>,
  ): Promise<CacheRefreshOutcome> {
    try {
      const fresh = await fetcher();
      await this.setAllTiers(cacheKey, fresh);
      logger.info(
        { cacheType: this.cacheType, cacheKey },
        'DomainCacheManager: forceRefresh succeeded, all tiers replaced',
      );
      return { outcome: 'refreshed' };
    } catch (err) {
      if (this.isMaintenanceError(err)) {
        logger.warn(
          {
            cacheType: this.cacheType,
            cacheKey,
            err: err instanceof Error ? err.message : String(err),
          },
          'DomainCacheManager: forceRefresh skipped (maintenance) — existing cache untouched',
        );
        return { outcome: 'maintenance-skip' };
      }
      const message = err instanceof Error ? err.message : String(err);
      logger.error(
        { cacheType: this.cacheType, cacheKey, err: message },
        'DomainCacheManager: forceRefresh failed (non-maintenance) — existing cache untouched',
      );
      return { outcome: 'error', error: message };
    }
  }

  /**
   * L1+L2+L3 동시 set. 각 계층 실패는 로그만 남기고 다른 계층에 영향 없음.
   */
  async setAllTiers(cacheKey: string, payload: T, sourceFetchedAt: Date = new Date()): Promise<void> {
    this.upsertMemory(cacheKey, payload, sourceFetchedAt.getTime());

    const promises: Promise<void>[] = [];
    if (this.redis.isConnected()) {
      promises.push(this.redis.set(cacheKey, payload, this.ttl.l2Seconds));
    }
    if (this.db.isConnected()) {
      promises.push(
        this.db
          .set(
            this.cacheType,
            cacheKey,
            payload,
            this.ttl.l3SoftSeconds,
            this.ttl.l3HardSeconds,
            sourceFetchedAt,
          )
          .catch((err) => {
            logger.error(
              {
                cacheType: this.cacheType,
                cacheKey,
                error: err instanceof Error ? err.message : String(err),
              },
              'DomainCacheManager: PG set failed',
            );
          }),
      );
    }
    await Promise.allSettled(promises);
  }

  /**
   * L1+L2+L3 동시 삭제 (수동 invalidation).
   */
  async invalidate(cacheKey: string): Promise<void> {
    this.memory.delete(cacheKey);
    const promises: Promise<void>[] = [];
    if (this.redis.isConnected()) promises.push(this.redis.del(cacheKey));
    if (this.db.isConnected()) promises.push(this.db.del(this.cacheType, cacheKey));
    await Promise.allSettled(promises);
    logger.info(
      { cacheType: this.cacheType, cacheKey },
      'DomainCacheManager: invalidated all tiers',
    );
  }

  /**
   * PG hydrate 시 호출. payload 의 source_fetched_at 을 기준으로 L1/L2 TTL 적용.
   * 외부에서도 warmup 등에서 호출 가능.
   */
  async hydrateUpperFromPayload(
    cacheKey: string,
    payload: T,
    sourceFetchedAt: Date = new Date(),
  ): Promise<void> {
    this.upsertMemory(cacheKey, payload, sourceFetchedAt.getTime());
    if (this.redis.isConnected()) {
      await this.redis.set(cacheKey, payload, this.ttl.l2Seconds);
    }
  }

  /**
   * 메모리 캐시 통계 (디버깅/테스트).
   */
  getMemorySize(): number {
    return this.memory.size;
  }

  /**
   * 점검 판별. 서브클래스가 override 가능.
   * design.md §"점검 판별 기준" 참조 (Q-1 default 유지, DP-1).
   */
  protected isMaintenanceError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    const msg = err.message;
    // 1) HTTP 5xx (api-client.ts 가 throw 하는 형식: `HTTP 503: <body>`)
    if (/^HTTP\s5\d{2}/.test(msg)) return true;
    // 2) 네트워크 레이어 (undici/fetch / DNS)
    if (/fetch failed|ETIMEDOUT|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN/i.test(msg)) {
      return true;
    }
    // 3) maintenance JSON 또는 한국어 점검 메시지 패턴
    if (/점검|유지보수|maintenance|service\s+unavailable/i.test(msg)) return true;
    return false;
  }

  /**
   * Redis hit 또는 PG hit 후 상위 계층(memory) 동기화.
   */
  protected async syncToUpper(cacheKey: string, payload: T): Promise<void> {
    this.upsertMemory(cacheKey, payload);
    if (this.redis.isConnected()) {
      await this.redis.set(cacheKey, payload, this.ttl.l2Seconds);
    }
  }

  /**
   * 메모리 set + cap 체크.
   */
  protected upsertMemory(cacheKey: string, payload: T, normalizedAt: number = Date.now()): void {
    this.memory.set(cacheKey, { payload, normalizedAt });
    this.enforceMemoryCap();
  }

  /**
   * 메모리 cap 초과 시 가장 오래된 entry 1개 evict.
   * 단순 구현 — LRU 가 필요해지면 후속 phase 에서 교체.
   */
  protected enforceMemoryCap(): void {
    if (this.memory.size <= this.memoryMaxEntries) return;
    let oldestKey: string | null = null;
    let oldestAt = Infinity;
    for (const [k, v] of this.memory.entries()) {
      if (v.normalizedAt < oldestAt) {
        oldestAt = v.normalizedAt;
        oldestKey = k;
      }
    }
    if (oldestKey !== null) {
      this.memory.delete(oldestKey);
      logger.debug(
        { cacheType: this.cacheType, evicted: oldestKey, size: this.memory.size },
        'DomainCacheManager: memory cap reached, evicted oldest',
      );
    }
  }
}
