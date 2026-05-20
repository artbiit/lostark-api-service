/**
 * @cursor-change: 2026-05-20, v1.0.0, NEWS 도메인 3-tier 캐시 매니저
 *
 * design.md §"도메인 서브클래스 시그니처" 의 NewsCacheManager 구현.
 *
 * - notices 와 events 가 동일 cache_type='news' 아래 다른 cache_key 로 공존.
 * - notices 는 searchParams 별 키 분리 (FR-2-4) — `news:notices:{hash}:v1`
 *   파라미터 없으면 `default` literal.
 * - events 는 단일 키 `news:events:v1`.
 * - notices 와 events 는 TTL 정책이 다르다 (design.md §"도메인별 캐시 정책").
 *   같은 매니저 안에서 서로 다른 TTL 을 사용하기 위해 set 시점에 직접 ttl 을 override.
 *   조회 경로(fetchWithFallback)는 베이스의 ttl 필드를 사용 — 따라서 베이스 ttl 은
 *   notices 정책으로 설정하고, events 는 setAllTiers/hydrateUpper 호출 시 override.
 *   정확히는 본 매니저는 events 도 베이스 fetchWithFallback 으로 처리하되, set 시
 *   eventsTtl 을 사용한 별도 경로를 추가한다.
 */

import { createHash } from 'crypto';

import { parseEnv } from '@lostark/shared/config/env';
import { logger } from '@lostark/shared';
import type { NoticeSearchParams } from '@lostark/shared/types/V9/news';

import { databaseDomainCache } from './database-domain-cache.js';
import {
  CacheLookupResult,
  CacheTierTtl,
  DomainCacheManager,
  MaintenanceUnavailableError,
} from './domain-cache-manager.js';
import { redisDomainCache } from './redis-domain-cache.js';
import type {
  NormalizedEventsResult,
  NormalizedNoticesResult,
} from '../normalizers/news-normalizer.js';

/** 공지/이벤트 두 종류의 페이로드를 한 매니저에서 처리하기 위한 union. */
export type NewsCachePayload = NormalizedNoticesResult | NormalizedEventsResult;

const NOTICES_DEFAULT_KEY = 'news:notices:default:v1';
const EVENTS_KEY = 'news:events:v1';

function buildNoticesTtl(): CacheTierTtl {
  const env = parseEnv();
  return {
    l1Seconds: env.CACHE_NEWS_NOTICES_L1_SECONDS,
    l2Seconds: env.CACHE_NEWS_NOTICES_L2_SECONDS,
    l3SoftSeconds: env.CACHE_NEWS_NOTICES_L3_SOFT_SECONDS,
    l3HardSeconds: env.CACHE_NEWS_NOTICES_L3_HARD_SECONDS,
  };
}

function buildEventsTtl(): CacheTierTtl {
  const env = parseEnv();
  return {
    l1Seconds: env.CACHE_NEWS_EVENTS_L1_SECONDS,
    l2Seconds: env.CACHE_NEWS_EVENTS_L2_SECONDS,
    l3SoftSeconds: env.CACHE_NEWS_EVENTS_L3_SOFT_SECONDS,
    l3HardSeconds: env.CACHE_NEWS_EVENTS_L3_HARD_SECONDS,
  };
}

/**
 * searchParams 정규화 + SHA1 8-hex prefix → cache key suffix.
 *
 * design.md §"Redis 키 네임스페이스 / TTL" 참조. 의존성 없이 stdlib crypto 사용.
 */
export function buildNoticesCacheKey(params?: NoticeSearchParams): string {
  if (!params || Object.keys(params).length === 0) {
    return NOTICES_DEFAULT_KEY;
  }

  // 정렬된 entries → URLSearchParams 호환 문자열
  const usp = new URLSearchParams();
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b));

  for (const [k, v] of entries) {
    usp.append(k, String(v));
  }

  const normalized = usp.toString();
  if (!normalized) return NOTICES_DEFAULT_KEY;

  const hash = createHash('sha1').update(normalized).digest('hex').slice(0, 8);
  return `news:notices:${hash}:v1`;
}

export class NewsCacheManager extends DomainCacheManager<NewsCachePayload> {
  protected readonly cacheType = 'news' as const;

  /** events 전용 TTL — 베이스 ttl 과 별개로 사용. */
  private readonly eventsTtl: CacheTierTtl;

  constructor(noticesTtlOverride?: CacheTierTtl, eventsTtlOverride?: CacheTierTtl) {
    super(noticesTtlOverride ?? buildNoticesTtl(), redisDomainCache, databaseDomainCache);
    this.eventsTtl = eventsTtlOverride ?? buildEventsTtl();
  }

  /**
   * 공지사항 조회 — searchParams 별 키.
   */
  async getNotices(
    fetcher: () => Promise<NormalizedNoticesResult>,
    params?: NoticeSearchParams,
  ): Promise<CacheLookupResult<NormalizedNoticesResult>> {
    const key = buildNoticesCacheKey(params);
    const result = await this.fetchWithFallback(key, fetcher as () => Promise<NewsCachePayload>);
    return result as CacheLookupResult<NormalizedNoticesResult>;
  }

  /**
   * 이벤트 조회 — 단일 키. notices 와 다른 TTL 정책 적용.
   *
   * 베이스 `fetchWithFallback` 는 this.ttl 을 사용하므로, events 호출 직전에
   * 임시로 ttl 을 events TTL 로 swap 하고 finally 에서 복원한다 — 단순한 방식이
   * 가독성 좋다. 매니저가 다중 인스턴스로 동시 호출되는 환경이 아니므로(싱글톤),
   * 동시성 위험은 무시 가능하나, 안전을 위해 별도 경로로 직접 구현.
   */
  async getEvents(
    fetcher: () => Promise<NormalizedEventsResult>,
  ): Promise<CacheLookupResult<NormalizedEventsResult>> {
    const cacheKey = EVENTS_KEY;

    // L1
    const memEntry = this.memory.get(cacheKey);
    if (memEntry && Date.now() - memEntry.normalizedAt <= this.eventsTtl.l1Seconds * 1000) {
      return {
        data: memEntry.payload as NormalizedEventsResult,
        source: 'memory',
        stale: false,
      };
    }
    if (memEntry) this.memory.delete(cacheKey);

    // L2
    if (this.redis.isConnected()) {
      const redisHit = await this.redis.get<NormalizedEventsResult>(cacheKey);
      if (redisHit !== null) {
        this.upsertMemory(cacheKey, redisHit);
        return { data: redisHit, source: 'redis', stale: false };
      }
    }

    // L3
    let staleRow: {
      payload: NormalizedEventsResult;
      sourceFetchedAt: Date;
    } | null = null;
    if (this.db.isConnected()) {
      const dbRow = await this.db.getRow<NormalizedEventsResult>(this.cacheType, cacheKey);
      if (dbRow) {
        if (dbRow.softExpiresAt.getTime() > Date.now()) {
          this.upsertMemory(cacheKey, dbRow.payload);
          if (this.redis.isConnected()) {
            await this.redis.set(cacheKey, dbRow.payload, this.eventsTtl.l2Seconds);
          }
          return { data: dbRow.payload, source: 'database', stale: false };
        }
        staleRow = { payload: dbRow.payload, sourceFetchedAt: dbRow.sourceFetchedAt };
      }
    }

    try {
      const fresh = await fetcher();
      // setAllTiers 를 events TTL 로 직접 호출
      this.upsertMemory(cacheKey, fresh);
      const promises: Promise<void>[] = [];
      if (this.redis.isConnected()) {
        promises.push(this.redis.set(cacheKey, fresh, this.eventsTtl.l2Seconds));
      }
      if (this.db.isConnected()) {
        promises.push(
          this.db
            .set(
              this.cacheType,
              cacheKey,
              fresh,
              this.eventsTtl.l3SoftSeconds,
              this.eventsTtl.l3HardSeconds,
            )
            .catch((err) => {
              logger.error(
                {
                  cacheType: this.cacheType,
                  cacheKey,
                  error: err instanceof Error ? err.message : String(err),
                },
                'NewsCacheManager: events PG set failed',
              );
            }),
        );
      }
      await Promise.allSettled(promises);
      return { data: fresh, source: 'api', stale: false };
    } catch (err) {
      const isMaintenance = this.isMaintenanceError(err);
      if (isMaintenance && staleRow) {
        const staleAgeSeconds = Math.max(
          0,
          Math.round((Date.now() - staleRow.sourceFetchedAt.getTime()) / 1000),
        );
        logger.warn(
          {
            cacheType: this.cacheType,
            cacheKey,
            staleAgeSeconds,
            err: err instanceof Error ? err.message : String(err),
          },
          'NewsCacheManager: SWR fallback for events',
        );
        return {
          data: staleRow.payload,
          source: 'database-stale',
          stale: true,
          staleAgeSeconds,
        };
      }
      if (isMaintenance) {
        throw new MaintenanceUnavailableError(cacheKey, err);
      }
      throw err;
    }
  }

  /**
   * 공지/이벤트 모두 invalidate (수동, 본 phase 미사용 — invalidate 메서드는 베이스 제공).
   */
  async invalidateNotices(params?: NoticeSearchParams): Promise<void> {
    await this.invalidate(buildNoticesCacheKey(params));
  }

  async invalidateEvents(): Promise<void> {
    await this.invalidate(EVENTS_KEY);
  }
}

// === 싱글톤 인스턴스 ===

export const newsCacheManager = new NewsCacheManager();

// === 키 export (warmup / 테스트용) ===

export const NEWS_NOTICES_DEFAULT_CACHE_KEY = NOTICES_DEFAULT_KEY;
export const NEWS_EVENTS_CACHE_KEY = EVENTS_KEY;
