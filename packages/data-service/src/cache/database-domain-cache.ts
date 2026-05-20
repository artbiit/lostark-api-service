/**
 * @cursor-change: 2026-05-20, v1.0.0, domain_cache 테이블용 PostgreSQL 어댑터
 *
 * design.md §"PostgreSQL 신규 테이블 — domain_cache" 의 CRUD 를 캡슐화.
 * - cache_type ('news' | 'gamecontents') + cache_key 복합 키
 * - soft_expires_at (재조회 트리거) / hard_expires_at (stale 절대 만료)
 * - parameterized query ($1, $2, ...) 만 사용 (NFR-보안)
 */

import { logger } from '@lostark/shared';
import { pgClient } from '@lostark/shared/db/postgres';

export type DomainCacheType = 'news' | 'gamecontents';

export interface DomainCacheRow<T> {
  payload: T;
  softExpiresAt: Date;
  hardExpiresAt: Date;
  sourceFetchedAt: Date;
}

type DomainCacheRawRow = {
  payload: unknown;
  soft_expires_at: Date;
  hard_expires_at: Date;
  source_fetched_at: Date;
} & Record<string, unknown>;

type DomainCacheCountRow = {
  count: string;
} & Record<string, unknown>;

/**
 * domain_cache 테이블 어댑터.
 *
 * 호출자가 cacheType + cacheKey 를 명시적으로 전달한다. payload 는 JSON 직렬화 가능한
 * 임의 객체. soft/hard TTL 은 상대 초 단위로 받아 NOW() 기준 timestamp 로 변환.
 */
export class DatabaseDomainCache {
  /**
   * upsert. UNIQUE (cache_type, cache_key) 충돌 시 payload + expires + fetched_at 갱신.
   */
  async set<T>(
    cacheType: DomainCacheType,
    cacheKey: string,
    payload: T,
    softTtlSeconds: number,
    hardTtlSeconds: number,
    sourceFetchedAt: Date = new Date(),
  ): Promise<void> {
    try {
      const serialized = JSON.stringify(payload);
      const payloadSize = Buffer.byteLength(serialized, 'utf8');
      const now = sourceFetchedAt.getTime();
      const softExpiresAt = new Date(now + softTtlSeconds * 1000);
      const hardExpiresAt = new Date(now + hardTtlSeconds * 1000);

      await pgClient.execute(
        `
        INSERT INTO domain_cache
          (cache_type, cache_key, payload, payload_size,
           soft_expires_at, hard_expires_at, source_fetched_at)
        VALUES ($1::cache_type_enum, $2, $3::jsonb, $4, $5, $6, $7)
        ON CONFLICT (cache_type, cache_key) DO UPDATE SET
          payload           = EXCLUDED.payload,
          payload_size      = EXCLUDED.payload_size,
          soft_expires_at   = EXCLUDED.soft_expires_at,
          hard_expires_at   = EXCLUDED.hard_expires_at,
          source_fetched_at = EXCLUDED.source_fetched_at
        `,
        [
          cacheType,
          cacheKey,
          serialized,
          payloadSize,
          softExpiresAt,
          hardExpiresAt,
          sourceFetchedAt,
        ],
      );

      logger.debug(
        {
          cacheType,
          cacheKey,
          payloadSize,
          softTtlSeconds,
          hardTtlSeconds,
        },
        'DatabaseDomainCache: row upserted',
      );
    } catch (error) {
      logger.error(
        {
          cacheType,
          cacheKey,
          error: error instanceof Error ? error.message : String(error),
        },
        'DatabaseDomainCache.set failed',
      );
      throw error;
    }
  }

  /**
   * 단일 행 조회 (hard 만료 이전인 행만 반환). soft 만료 여부는 호출자가 판단.
   *
   * SQL 의 hard_expires_at > NOW() 필터로 hard 만료된 행은 반환되지 않는다 — stale 정책의
   * "절대 만료" 기준선. (D-5)
   */
  async getRow<T>(cacheType: DomainCacheType, cacheKey: string): Promise<DomainCacheRow<T> | null> {
    try {
      const rows = await pgClient.query<DomainCacheRawRow>(
        `
        SELECT payload, soft_expires_at, hard_expires_at, source_fetched_at
        FROM domain_cache
        WHERE cache_type = $1::cache_type_enum
          AND cache_key  = $2
          AND hard_expires_at > NOW()
        `,
        [cacheType, cacheKey],
      );

      if (rows.length === 0) {
        logger.debug({ cacheType, cacheKey }, 'DatabaseDomainCache: row miss (or hard-expired)');
        return null;
      }

      const row = rows[0]!;
      const payload =
        typeof row.payload === 'string' ? (JSON.parse(row.payload) as T) : (row.payload as T);

      return {
        payload,
        softExpiresAt: row.soft_expires_at,
        hardExpiresAt: row.hard_expires_at,
        sourceFetchedAt: row.source_fetched_at,
      };
    } catch (error) {
      logger.error(
        {
          cacheType,
          cacheKey,
          error: error instanceof Error ? error.message : String(error),
        },
        'DatabaseDomainCache.getRow failed',
      );
      return null;
    }
  }

  /**
   * 단일 키 삭제 (수동 invalidation).
   */
  async del(cacheType: DomainCacheType, cacheKey: string): Promise<void> {
    try {
      await pgClient.execute(
        `DELETE FROM domain_cache WHERE cache_type = $1::cache_type_enum AND cache_key = $2`,
        [cacheType, cacheKey],
      );
      logger.debug({ cacheType, cacheKey }, 'DatabaseDomainCache: row deleted');
    } catch (error) {
      logger.error(
        {
          cacheType,
          cacheKey,
          error: error instanceof Error ? error.message : String(error),
        },
        'DatabaseDomainCache.del failed',
      );
    }
  }

  /**
   * cache_type 단위 전체 삭제 (운영/테스트).
   */
  async clearByType(cacheType: DomainCacheType): Promise<number> {
    try {
      const result = await pgClient.execute(
        `DELETE FROM domain_cache WHERE cache_type = $1::cache_type_enum`,
        [cacheType],
      );
      logger.warn(
        { cacheType, deleted: result.rowCount },
        'DatabaseDomainCache: cleared all rows of type',
      );
      return result.rowCount;
    } catch (error) {
      logger.error(
        {
          cacheType,
          error: error instanceof Error ? error.message : String(error),
        },
        'DatabaseDomainCache.clearByType failed',
      );
      return 0;
    }
  }

  /**
   * hard 만료 행 일괄 삭제. cleanup 스케줄러가 호출.
   */
  async cleanup(): Promise<number> {
    try {
      const startedAt = Date.now();
      const result = await pgClient.execute(`DELETE FROM domain_cache WHERE hard_expires_at <= NOW()`);
      logger.info(
        { deleted: result.rowCount, durationMs: Date.now() - startedAt },
        'DatabaseDomainCache: hard-expired rows cleaned up',
      );
      return result.rowCount;
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'DatabaseDomainCache.cleanup failed',
      );
      return 0;
    }
  }

  /**
   * 통계 — cache_type 단위 행 수 집계.
   */
  async countByType(cacheType: DomainCacheType): Promise<number> {
    try {
      const rows = await pgClient.query<DomainCacheCountRow>(
        `SELECT COUNT(*) as count FROM domain_cache WHERE cache_type = $1::cache_type_enum`,
        [cacheType],
      );
      return Number(rows[0]?.count ?? 0);
    } catch (error) {
      logger.error(
        {
          cacheType,
          error: error instanceof Error ? error.message : String(error),
        },
        'DatabaseDomainCache.countByType failed',
      );
      return 0;
    }
  }

  /**
   * PostgreSQL 연결 상태 — 매니저가 L3 skip 분기에 사용.
   */
  isConnected(): boolean {
    return pgClient.isConnectedToPostgres();
  }
}

// === cleanup 스케줄러 ===

/**
 * domain_cache 정리 스케줄러. 기본 1시간 간격.
 */
export function startDomainCacheCleanupScheduler(intervalMs: number = 60 * 60 * 1000): NodeJS.Timeout {
  const timer = setInterval(async () => {
    try {
      await databaseDomainCache.cleanup();
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to cleanup domain_cache',
      );
    }
  }, intervalMs);
  timer.unref();
  return timer;
}

// === 싱글톤 인스턴스 ===

export const databaseDomainCache = new DatabaseDomainCache();
