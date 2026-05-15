/**
 * @cursor-change: 2025-01-27, v1.0.0, 캐시 관리자 구현
 *
 * 캐시 관리자 모듈
 * - 3계층 캐싱 구조 관리 (Memory → Redis → Database)
 * - 캐시 계층 간 데이터 동기화
 * - 에러 처리 및 폴백 메커니즘
 * - 성능 최적화 및 모니터링
 */

import { logger } from '@lostark/shared';
import { NormalizedCharacterDetail } from '../normalizers/armories-normalizer.js';
import { armoriesCache, CacheStats as MemoryCacheStats } from './armories-cache.js';
import { databaseCache, DatabaseCacheStats } from './database-cache.js';
import { redisCache, RedisCacheStats } from './redis-cache.js';

// === 통합 캐시 통계 타입 ===

export interface IntegratedCacheStats {
  memory: MemoryCacheStats;
  redis: RedisCacheStats;
  database: DatabaseCacheStats;
  overall: {
    totalHits: number;
    totalMisses: number;
    hitRate: number;
    averageResponseTime: number; // 밀리초
  };
}

// === 캐시 계층 관리자 ===

/**
 * 캐시 계층 관리자
 * 3계층 캐싱 구조를 관리하고 최적화
 */
export class CacheManager {
  private responseTimes: number[] = [];
  private maxResponseTimeHistory = 100;

  /**
   * 캐릭터 상세 정보 조회 (3계층 캐싱)
   * Memory → Redis → Database 순서로 조회
   */
  async getCharacterDetail(characterName: string): Promise<NormalizedCharacterDetail | null> {
    const startTime = Date.now();

    try {
      // 1단계: Memory Cache 조회
      logger.debug('Checking memory cache', { characterName });
      const memoryResult = await armoriesCache.getCharacterDetail(characterName);

      if (memoryResult) {
        this.recordResponseTime(Date.now() - startTime);
        logger.debug('Memory cache hit', { characterName });
        return memoryResult;
      }

      // 2단계: Redis Cache 조회
      if (redisCache.isConnected()) {
        logger.debug('Checking Redis cache', { characterName });
        const redisResult = await redisCache.getCharacterDetail(characterName);

        if (redisResult) {
          // Redis에서 조회된 데이터를 Memory Cache에도 저장
          await this.syncToMemoryCache(characterName, redisResult);

          this.recordResponseTime(Date.now() - startTime);
          logger.debug('Redis cache hit, synced to memory', { characterName });
          return redisResult;
        }
      } else {
        logger.warn('Redis not connected, skipping Redis cache', { characterName });
      }

      // 3단계: Database Cache 조회
      if (databaseCache.isConnected()) {
        logger.debug('Checking database cache', { characterName });
        const databaseResult = await databaseCache.getCharacterDetail(characterName);

        if (databaseResult) {
          // Database에서 조회된 데이터를 상위 캐시 계층에도 저장
          await this.syncToUpperCacheLayers(characterName, databaseResult);

          this.recordResponseTime(Date.now() - startTime);
          logger.debug('Database cache hit, synced to upper layers', { characterName });
          return databaseResult;
        }
      } else {
        logger.warn('Database not connected, skipping database cache', { characterName });
      }

      this.recordResponseTime(Date.now() - startTime);
      logger.debug('All cache layers miss', { characterName });
      return null;
    } catch (error) {
      this.recordResponseTime(Date.now() - startTime);
      logger.error('Failed to get character detail from cache layers', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 캐릭터 상세 정보 저장 (3계층 캐싱)
   * 모든 계층에 동시 저장
   */
  async setCharacterDetail(
    characterName: string,
    characterDetail: NormalizedCharacterDetail,
    ttlMinutes?: number,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // 병렬로 모든 계층에 저장
      const promises: Promise<void>[] = [];

      // Memory Cache 저장
      promises.push(
        armoriesCache
          .setCharacterDetail(characterName, characterDetail, ttlMinutes)
          .catch((error) => {
            logger.error('Failed to save to memory cache', {
              characterName,
              error: error instanceof Error ? error.message : String(error),
            });
          }),
      );

      // Redis Cache 저장
      if (redisCache.isConnected()) {
        promises.push(
          redisCache
            .setCharacterDetail(characterName, characterDetail, ttlMinutes)
            .catch((error) => {
              logger.error('Failed to save to Redis cache', {
                characterName,
                error: error instanceof Error ? error.message : String(error),
              });
            }),
        );
      }

      // Database Cache 저장
      if (databaseCache.isConnected()) {
        promises.push(
          databaseCache.setCharacterDetail(characterName, characterDetail).catch((error) => {
            logger.error('Failed to save to database cache', {
              characterName,
              error: error instanceof Error ? error.message : String(error),
            });
          }),
        );
      }

      // 모든 저장 작업 완료 대기
      await Promise.allSettled(promises);

      this.recordResponseTime(Date.now() - startTime);
      logger.debug('Character detail saved to all cache layers', {
        characterName,
        layers: ['memory', 'redis', 'database'],
        ttlMinutes,
      });
    } catch (error) {
      this.recordResponseTime(Date.now() - startTime);
      logger.error('Failed to save character detail to cache layers', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 캐릭터 상세 정보 삭제 (3계층 캐싱)
   * 모든 계층에서 동시 삭제
   */
  async deleteCharacterDetail(characterName: string): Promise<void> {
    try {
      // 병렬로 모든 계층에서 삭제
      const promises: Promise<void>[] = [];

      // Memory Cache 삭제
      promises.push(
        armoriesCache.deleteCharacterDetail(characterName).catch((error) => {
          logger.error('Failed to delete from memory cache', {
            characterName,
            error: error instanceof Error ? error.message : String(error),
          });
        }),
      );

      // Redis Cache 삭제
      if (redisCache.isConnected()) {
        promises.push(
          redisCache.deleteCharacterDetail(characterName).catch((error) => {
            logger.error('Failed to delete from Redis cache', {
              characterName,
              error: error instanceof Error ? error.message : String(error),
            });
          }),
        );
      }

      // Database Cache 삭제
      if (databaseCache.isConnected()) {
        promises.push(
          databaseCache.deleteCharacterDetail(characterName).catch((error) => {
            logger.error('Failed to delete from database cache', {
              characterName,
              error: error instanceof Error ? error.message : String(error),
            });
          }),
        );
      }

      // 모든 삭제 작업 완료 대기
      await Promise.allSettled(promises);

      logger.debug('Character detail deleted from all cache layers', {
        characterName,
        layers: ['memory', 'redis', 'database'],
      });
    } catch (error) {
      logger.error('Failed to delete character detail from cache layers', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 캐시 통계 조회 (통합)
   */
  async getCacheStats(): Promise<IntegratedCacheStats> {
    try {
      const [memoryStats, redisStats, databaseStats] = await Promise.all([
        armoriesCache.getCacheStats(),
        redisCache.getCacheStats(),
        databaseCache.getCacheStats(),
      ]);

      // 전체 통계 계산
      const totalHits = memoryStats.totalHits + redisStats.totalHits + databaseStats.totalHits;
      const totalMisses =
        memoryStats.totalMisses + redisStats.totalMisses + databaseStats.totalMisses;
      const totalRequests = totalHits + totalMisses;
      const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;

      // 평균 응답 시간 계산
      const averageResponseTime = this.calculateAverageResponseTime();

      return {
        memory: memoryStats,
        redis: redisStats,
        database: databaseStats,
        overall: {
          totalHits,
          totalMisses,
          hitRate,
          averageResponseTime,
        },
      };
    } catch (error) {
      logger.error('Failed to get integrated cache stats', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        memory: {
          totalEntries: 0,
          expiredEntries: 0,
          memoryUsage: 0,
          hitRate: 0,
          totalHits: 0,
          totalMisses: 0,
        },
        redis: {
          totalEntries: 0,
          memoryUsage: 0,
          hitRate: 0,
          totalHits: 0,
          totalMisses: 0,
          lastCleanup: null,
        },
        database: {
          totalEntries: 0,
          expiredEntries: 0,
          totalDataSize: 0,
          hitRate: 0,
          totalHits: 0,
          totalMisses: 0,
          lastCleanup: null,
        },
        overall: {
          totalHits: 0,
          totalMisses: 0,
          hitRate: 0,
          averageResponseTime: 0,
        },
      };
    }
  }

  /**
   * 캐시 정리 (모든 계층)
   */
  async cleanup(): Promise<void> {
    try {
      // 병렬로 모든 계층 정리
      const promises: Promise<void>[] = [
        armoriesCache.cleanup(),
        redisCache.cleanup(),
        databaseCache.cleanup(),
      ];

      await Promise.allSettled(promises);

      logger.info('Cache cleanup completed for all layers');
    } catch (error) {
      logger.error('Failed to cleanup cache layers', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 캐시 초기화 (모든 계층)
   */
  async clear(): Promise<void> {
    try {
      // 병렬로 모든 계층 초기화
      const promises: Promise<void>[] = [
        armoriesCache.clear(),
        redisCache.clearAll(),
        databaseCache.clearAll(),
      ];

      await Promise.allSettled(promises);

      // 응답 시간 기록 초기화
      this.responseTimes = [];

      logger.info('Cache cleared for all layers');
    } catch (error) {
      logger.error('Failed to clear cache layers', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Redis에서 Memory Cache로 데이터 동기화
   */
  private async syncToMemoryCache(
    characterName: string,
    characterDetail: NormalizedCharacterDetail,
  ): Promise<void> {
    try {
      await armoriesCache.setCharacterDetail(characterName, characterDetail);
      logger.debug('Data synced from Redis to Memory cache', { characterName });
    } catch (error) {
      logger.error('Failed to sync data from Redis to Memory cache', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Database에서 상위 캐시 계층으로 데이터 동기화
   */
  private async syncToUpperCacheLayers(
    characterName: string,
    characterDetail: NormalizedCharacterDetail,
  ): Promise<void> {
    try {
      // Memory Cache에 저장
      await armoriesCache.setCharacterDetail(characterName, characterDetail);

      // Redis Cache에 저장 (연결된 경우)
      if (redisCache.isConnected()) {
        await redisCache.setCharacterDetail(characterName, characterDetail);
      }

      logger.debug('Data synced from Database to upper cache layers', { characterName });
    } catch (error) {
      logger.error('Failed to sync data from Database to upper cache layers', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 응답 시간 기록
   */
  private recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);

    // 최대 기록 수 제한
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes.shift();
    }
  }

  /**
   * 평균 응답 시간 계산
   */
  private calculateAverageResponseTime(): number {
    if (this.responseTimes.length === 0) {
      return 0;
    }

    const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
    return Math.round(sum / this.responseTimes.length);
  }

  /**
   * 캐시 계층 상태 확인
   */
  getCacheLayerStatus(): {
    memory: boolean;
    redis: boolean;
    database: boolean;
  } {
    return {
      memory: true, // Memory는 항상 사용 가능
      redis: redisCache.isConnected(),
      database: databaseCache.isConnected(),
    };
  }
}

// === 캐시 관리자 스케줄러 ===

/**
 * 캐시 관리자 정리 스케줄러 시작
 */
export function startCacheManagerCleanupScheduler(): NodeJS.Timeout {
  // 15분마다 캐시 정리
  const interval = 15 * 60 * 1000;

  return setInterval(async () => {
    try {
      await cacheManager.cleanup();
    } catch (error) {
      logger.error('Failed to cleanup cache manager', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, interval);
}

// === 싱글톤 인스턴스 ===

/**
 * 캐시 관리자 인스턴스
 */
export const cacheManager = new CacheManager();
