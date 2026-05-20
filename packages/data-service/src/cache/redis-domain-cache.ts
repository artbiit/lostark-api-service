/**
 * @cursor-change: 2026-05-20, v1.0.0, news/gamecontents 도메인 캐시용 Redis 어댑터
 *
 * 기존 RedisCache (character 전용 시그니처) 와 독립된, 임의 도메인용 얇은 어댑터.
 * - prefix 와 TTL 만 받아 set/get/del 수행
 * - 키 네임스페이스는 매니저가 결정 (예: news:notices:default:v1)
 * - 직렬화는 JSON.stringify/JSON.parse, payload 는 generic T
 *
 * design.md §"Redis 키 네임스페이스 / TTL" 및 D-2 (RedisCache 비침습 원칙) 참조.
 */

import { logger } from '@lostark/shared';
import { redisClient } from '@lostark/shared/db/redis';

export interface RedisDomainCacheEntry<T> {
  payload: T;
  cachedAt: string; // ISO timestamp
}

/**
 * 도메인 무관 Redis 어댑터.
 * - 호출자가 키 (예: `news:events:v1`) 와 TTL 초를 명시적으로 전달한다.
 * - 본 클래스는 `domain_cache` PostgreSQL 테이블과 무관 — Redis 만 담당.
 */
export class RedisDomainCache {
  /**
   * 캐시 저장. ttlSeconds 가 0 이하이면 미저장 (안전장치).
   */
  async set<T>(cacheKey: string, payload: T, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) {
      logger.debug({ cacheKey, ttlSeconds }, 'RedisDomainCache.set skipped (non-positive TTL)');
      return;
    }
    try {
      const entry: RedisDomainCacheEntry<T> = {
        payload,
        cachedAt: new Date().toISOString(),
      };
      const serialized = JSON.stringify(entry);
      await redisClient.set(cacheKey, serialized, ttlSeconds);
      logger.debug(
        { cacheKey, ttlSeconds, byteSize: serialized.length },
        'RedisDomainCache: payload cached',
      );
    } catch (error) {
      logger.error(
        {
          cacheKey,
          error: error instanceof Error ? error.message : String(error),
        },
        'RedisDomainCache.set failed',
      );
      // 상위 매니저가 fallback 결정하도록 throw 하지 않는다.
    }
  }

  /**
   * 캐시 조회. miss/오류 시 null.
   */
  async get<T>(cacheKey: string): Promise<T | null> {
    try {
      const raw = await redisClient.get(cacheKey);
      if (!raw) {
        logger.debug({ cacheKey }, 'RedisDomainCache: cache miss');
        return null;
      }
      const entry = JSON.parse(raw) as RedisDomainCacheEntry<T>;
      logger.debug({ cacheKey }, 'RedisDomainCache: cache hit');
      return entry.payload;
    } catch (error) {
      logger.error(
        {
          cacheKey,
          error: error instanceof Error ? error.message : String(error),
        },
        'RedisDomainCache.get failed',
      );
      return null;
    }
  }

  /**
   * 키 삭제 (수동 invalidation).
   */
  async del(cacheKey: string): Promise<void> {
    try {
      await redisClient.del(cacheKey);
      logger.debug({ cacheKey }, 'RedisDomainCache: key deleted');
    } catch (error) {
      logger.error(
        {
          cacheKey,
          error: error instanceof Error ? error.message : String(error),
        },
        'RedisDomainCache.del failed',
      );
    }
  }

  /**
   * Redis 연결 상태 확인 — 매니저가 L2 skip 분기에 사용.
   */
  isConnected(): boolean {
    return redisClient.isConnectedToRedis();
  }
}

// === 싱글톤 인스턴스 ===

export const redisDomainCache = new RedisDomainCache();
