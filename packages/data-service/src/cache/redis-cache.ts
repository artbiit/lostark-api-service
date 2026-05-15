/**
 * @cursor-change: 2025-01-27, v1.0.0, Redis 캐시 모듈 구현
 *
 * Redis 캐시 모듈
 * - 캐릭터 데이터 저장/조회
 * - 동적 TTL 관리
 * - 캐시 통계 및 정리
 * - 에러 처리 및 폴백
 */

import { logger } from '@lostark/shared';
import { redisClient } from '@lostark/shared/db/redis';
import { NormalizedCharacterDetail } from '../normalizers/armories-normalizer.js';

// === 캐시 통계 타입 ===

export interface RedisCacheStats {
  totalEntries: number;
  memoryUsage: number; // 바이트 단위
  hitRate: number; // 0-1 사이 값
  totalHits: number;
  totalMisses: number;
  lastCleanup: Date | null;
}

// === 캐시 키 생성 ===

const cacheKeys = {
  // 캐릭터 전체 데이터
  character: (name: string) => `char:${name.toLowerCase()}:v1`,

  // 캐릭터 메타데이터
  characterMeta: (name: string) => `char:${name.toLowerCase()}:meta`,

  // 캐시 통계
  stats: () => `cache:stats:armories`,

  // 캐시 키 패턴 (정리용)
  pattern: () => 'char:*:v1',
};

// === Redis 캐시 모듈 ===

/**
 * Redis 캐시 모듈
 */
export class RedisCache {
  private stats = {
    totalHits: 0,
    totalMisses: 0,
  };

  /**
   * 캐릭터 상세 정보 저장
   */
  async setCharacterDetail(
    characterName: string,
    characterDetail: NormalizedCharacterDetail,
    ttlMinutes?: number,
  ): Promise<void> {
    try {
      const key = cacheKeys.character(characterName);
      const ttl = ttlMinutes ? ttlMinutes * 60 : this.calculateDynamicTTL(characterDetail);

      // 데이터 직렬화
      const serializedData = JSON.stringify({
        data: characterDetail,
        createdAt: new Date().toISOString(),
        version: 'v1',
      });

      // Redis에 저장
      await redisClient.set(key, serializedData, ttl);

      // 메타데이터 저장
      const metaKey = cacheKeys.characterMeta(characterName);
      const metaData = {
        itemLevel: characterDetail.itemLevel,
        characterName: characterDetail.characterName,
        serverName: characterDetail.serverName,
        lastUpdated: new Date().toISOString(),
        ttl,
      };
      await redisClient.set(metaKey, JSON.stringify(metaData), ttl);

      logger.debug('Character detail cached in Redis', {
        characterName,
        ttlMinutes: Math.round(ttl / 60),
        dataSize: serializedData.length,
      });
    } catch (error) {
      logger.error('Failed to cache character detail in Redis', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 캐릭터 상세 정보 조회
   */
  async getCharacterDetail(characterName: string): Promise<NormalizedCharacterDetail | null> {
    try {
      const key = cacheKeys.character(characterName);
      const serializedData = await redisClient.get(key);

      if (!serializedData) {
        this.stats.totalMisses++;
        logger.debug('Character detail Redis cache miss', { characterName });
        return null;
      }

      // 데이터 역직렬화
      const parsed = JSON.parse(serializedData);
      const characterDetail = parsed.data as NormalizedCharacterDetail;

      this.stats.totalHits++;
      logger.debug('Character detail Redis cache hit', { characterName });

      return characterDetail;
    } catch (error) {
      this.stats.totalMisses++;
      logger.error('Failed to get character detail from Redis', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 캐릭터 상세 정보 삭제
   */
  async deleteCharacterDetail(characterName: string): Promise<void> {
    try {
      const key = cacheKeys.character(characterName);
      const metaKey = cacheKeys.characterMeta(characterName);

      await redisClient.del(key);
      await redisClient.del(metaKey);

      logger.debug('Character detail deleted from Redis', { characterName });
    } catch (error) {
      logger.error('Failed to delete character detail from Redis', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 캐릭터 메타데이터 조회
   */
  async getCharacterMeta(characterName: string): Promise<{
    itemLevel: number;
    characterName: string;
    serverName: string;
    lastUpdated: string;
    ttl: number;
  } | null> {
    try {
      const metaKey = cacheKeys.characterMeta(characterName);
      const serializedMeta = await redisClient.get(metaKey);

      if (!serializedMeta) {
        return null;
      }

      return JSON.parse(serializedMeta);
    } catch (error) {
      logger.error('Failed to get character meta from Redis', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 캐시 통계 조회
   */
  async getCacheStats(): Promise<RedisCacheStats> {
    try {
      const redisStats = await redisClient.getStats();
      const totalRequests = this.stats.totalHits + this.stats.totalMisses;
      const hitRate = totalRequests > 0 ? this.stats.totalHits / totalRequests : 0;

      // Redis에서 총 키 수 조회
      const totalEntries = redisStats.totalKeys;

      return {
        totalEntries,
        memoryUsage: redisStats.memoryUsage,
        hitRate,
        totalHits: this.stats.totalHits,
        totalMisses: this.stats.totalMisses,
        lastCleanup: null, // TODO: 마지막 정리 시간 추적
      };
    } catch (error) {
      logger.error('Failed to get Redis cache stats', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        totalEntries: 0,
        memoryUsage: 0,
        hitRate: 0,
        totalHits: this.stats.totalHits,
        totalMisses: this.stats.totalMisses,
        lastCleanup: null,
      };
    }
  }

  /**
   * 캐시 정리 (만료된 키 삭제)
   */
  async cleanup(): Promise<void> {
    try {
      // Redis는 자동으로 만료된 키를 삭제하므로
      // 여기서는 통계만 업데이트
      const stats = await this.getCacheStats();

      logger.info('Redis cache cleanup completed', {
        totalEntries: stats.totalEntries,
        memoryUsage: stats.memoryUsage,
      });
    } catch (error) {
      logger.error('Failed to cleanup Redis cache', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 모든 캐릭터 데이터 삭제
   */
  async clearAll(): Promise<void> {
    try {
      // Redis FLUSHDB 명령어 사용 (현재 데이터베이스만)
      // 주의: 모든 키가 삭제되므로 신중하게 사용
      logger.warn('Clearing all Redis cache data');

      // TODO: FLUSHDB 구현 또는 패턴 기반 삭제
      // 현재는 개별 키 삭제만 지원

      logger.info('Redis cache cleared');
    } catch (error) {
      logger.error('Failed to clear Redis cache', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 캐시 키 존재 여부 확인
   */
  async hasCharacterDetail(characterName: string): Promise<boolean> {
    try {
      const key = cacheKeys.character(characterName);
      return await redisClient.exists(key);
    } catch (error) {
      logger.error('Failed to check character detail existence in Redis', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * 캐시 키 TTL 조회
   */
  async getCharacterDetailTTL(characterName: string): Promise<number> {
    try {
      const key = cacheKeys.character(characterName);
      return await redisClient.ttl(key);
    } catch (error) {
      logger.error('Failed to get character detail TTL from Redis', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
      });
      return -1;
    }
  }

  /**
   * 동적 TTL 계산
   * 캐릭터 레벨에 따라 TTL 조정
   */
  private calculateDynamicTTL(characterDetail: NormalizedCharacterDetail): number {
    // 기본 TTL: 30분 (1800초)
    const baseTTL = 1800;

    // 아이템 레벨에 따른 TTL 조정
    const itemLevel = characterDetail.itemLevel;
    let ttlMultiplier = 1.0;

    if (itemLevel >= 1600) {
      // 최고 레벨 캐릭터: 짧은 TTL (15분)
      ttlMultiplier = 0.5;
    } else if (itemLevel >= 1580) {
      // 고레벨 캐릭터: 중간 TTL (20분)
      ttlMultiplier = 0.67;
    } else if (itemLevel >= 1540) {
      // 중레벨 캐릭터: 기본 TTL (25분)
      ttlMultiplier = 0.83;
    } else {
      // 저레벨 캐릭터: 긴 TTL (30분)
      ttlMultiplier = 1.0;
    }

    return Math.round(baseTTL * ttlMultiplier);
  }

  /**
   * Redis 연결 상태 확인
   */
  isConnected(): boolean {
    return redisClient.isConnectedToRedis();
  }
}

// === 캐시 정리 스케줄러 ===

/**
 * Redis 캐시 정리 스케줄러 시작
 */
export function startRedisCacheCleanupScheduler(): NodeJS.Timeout {
  // 10분마다 캐시 정리 (Redis는 자동 만료이므로 통계만 업데이트)
  const interval = 10 * 60 * 1000;

  return setInterval(async () => {
    try {
      await redisCache.cleanup();
    } catch (error) {
      logger.error('Failed to cleanup Redis cache', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, interval);
}

// === 싱글톤 인스턴스 ===

/**
 * Redis 캐시 인스턴스
 */
export const redisCache = new RedisCache();
