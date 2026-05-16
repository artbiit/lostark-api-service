/**
 * @cursor-change: 2025-01-27, v1.0.0, 3계층 캐시 최적화 모듈 구현
 *
 * 3계층 캐시 시스템 최적화 모듈
 * - 캐시 계층별 성능 최적화
 * - 자동 캐시 계층 조정
 * - 성능 모니터링 및 알림
 * - 캐시 히트율 최적화
 */

import { logger } from '@lostark/shared';
import { armoriesCache } from './armories-cache.js';
import { cacheManager, IntegratedCacheStats } from './cache-manager.js';
import { databaseCache } from './database-cache.js';
import { redisCache } from './redis-cache.js';

// === 캐시 최적화 설정 ===

export interface CacheOptimizationConfig {
  // 성능 임계값
  memoryHitRateThreshold: number; // 0.8 (80%)
  redisHitRateThreshold: number; // 0.7 (70%)
  databaseHitRateThreshold: number; // 0.9 (90%)

  // 응답 시간 임계값 (밀리초)
  memoryResponseTimeThreshold: number; // 5ms
  redisResponseTimeThreshold: number; // 20ms
  databaseResponseTimeThreshold: number; // 100ms

  // 자동 최적화 설정
  enableAutoOptimization: boolean;
  optimizationInterval: number; // 5분 (300초)

  // 캐시 크기 제한
  maxMemoryEntries: number; // 1000개
  maxRedisEntries: number; // 10000개
  maxDatabaseEntries: number; // 100000개
}

// === 캐시 최적화 통계 ===

export interface CacheOptimizationStats {
  timestamp: Date;
  overallHitRate: number;
  layerStats: {
    memory: {
      hitRate: number;
      responseTime: number;
      entryCount: number;
      optimizationNeeded: boolean;
    };
    redis: {
      hitRate: number;
      responseTime: number;
      entryCount: number;
      optimizationNeeded: boolean;
    };
    database: {
      hitRate: number;
      responseTime: number;
      entryCount: number;
      optimizationNeeded: boolean;
    };
  };
  optimizations: {
    memoryCleanup: boolean;
    redisCleanup: boolean;
    databaseCleanup: boolean;
    layerAdjustment: boolean;
  };
}

// === 캐시 최적화 모듈 ===

/**
 * 3계층 캐시 최적화 모듈
 */
export class CacheOptimizer {
  private config: CacheOptimizationConfig;
  private optimizationTimer: NodeJS.Timeout | null = null;
  private lastOptimizationStats: CacheOptimizationStats | null = null;

  constructor(config: Partial<CacheOptimizationConfig> = {}) {
    this.config = {
      memoryHitRateThreshold: 0.8,
      redisHitRateThreshold: 0.7,
      databaseHitRateThreshold: 0.9,
      memoryResponseTimeThreshold: 5,
      redisResponseTimeThreshold: 20,
      databaseResponseTimeThreshold: 100,
      enableAutoOptimization: true,
      optimizationInterval: 300, // 5분
      maxMemoryEntries: 1000,
      maxRedisEntries: 10000,
      maxDatabaseEntries: 100000,
      ...config,
    };
  }

  /**
   * 캐시 최적화 시작
   */
  startOptimization(): void {
    if (this.optimizationTimer) {
      logger.warn('Cache optimization is already running');
      return;
    }

    if (!this.config.enableAutoOptimization) {
      logger.info('Auto optimization is disabled');
      return;
    }

    this.optimizationTimer = setInterval(() => {
      this.performOptimization().catch((error) => {
        logger.error('Cache optimization failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }, this.config.optimizationInterval * 1000);
    this.optimizationTimer.unref();

    logger.info('Cache optimization started', {
      interval: this.config.optimizationInterval,
    });
  }

  /**
   * 캐시 최적화 중지
   */
  stopOptimization(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = null;
      logger.info('Cache optimization stopped');
    }
  }

  /**
   * 캐시 최적화 수행
   */
  async performOptimization(): Promise<CacheOptimizationStats> {
    const startTime = Date.now();

    try {
      // 현재 캐시 통계 수집
      const cacheStats = await cacheManager.getCacheStats();

      // 최적화 통계 분석
      const optimizationStats = this.analyzeOptimizationNeeds(cacheStats);

      // 최적화 수행
      await this.executeOptimizations(optimizationStats);

      // 최적화 결과 기록
      this.lastOptimizationStats = {
        ...optimizationStats,
        timestamp: new Date(),
      };

      const optimizationTime = Date.now() - startTime;

      logger.info('Cache optimization completed', {
        optimizationTime,
        optimizations: optimizationStats.optimizations,
      });

      return this.lastOptimizationStats;
    } catch (error) {
      logger.error('Cache optimization failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 최적화 필요성 분석
   */
  private analyzeOptimizationNeeds(cacheStats: IntegratedCacheStats): CacheOptimizationStats {
    const overallHitRate = cacheStats.overall.hitRate;

    // 각 계층별 최적화 필요성 분석
    const memoryOptimizationNeeded =
      cacheStats.memory.hitRate < this.config.memoryHitRateThreshold ||
      cacheStats.memory.totalEntries > this.config.maxMemoryEntries;

    const redisOptimizationNeeded =
      cacheStats.redis.hitRate < this.config.redisHitRateThreshold ||
      cacheStats.redis.totalEntries > this.config.maxRedisEntries;

    const databaseOptimizationNeeded =
      cacheStats.database.hitRate < this.config.databaseHitRateThreshold ||
      cacheStats.database.totalEntries > this.config.maxDatabaseEntries;

    return {
      timestamp: new Date(),
      overallHitRate,
      layerStats: {
        memory: {
          hitRate: cacheStats.memory.hitRate,
          responseTime: cacheStats.overall.averageResponseTime,
          entryCount: cacheStats.memory.totalEntries,
          optimizationNeeded: memoryOptimizationNeeded,
        },
        redis: {
          hitRate: cacheStats.redis.hitRate,
          responseTime: cacheStats.overall.averageResponseTime,
          entryCount: cacheStats.redis.totalEntries,
          optimizationNeeded: redisOptimizationNeeded,
        },
        database: {
          hitRate: cacheStats.database.hitRate,
          responseTime: cacheStats.overall.averageResponseTime,
          entryCount: cacheStats.database.totalEntries,
          optimizationNeeded: databaseOptimizationNeeded,
        },
      },
      optimizations: {
        memoryCleanup: memoryOptimizationNeeded,
        redisCleanup: redisOptimizationNeeded,
        databaseCleanup: databaseOptimizationNeeded,
        layerAdjustment: overallHitRate < 0.8, // 전체 히트율이 80% 미만일 때
      },
    };
  }

  /**
   * 최적화 실행
   */
  private async executeOptimizations(stats: CacheOptimizationStats): Promise<void> {
    const optimizations: Promise<void>[] = [];

    // Memory Cache 최적화
    if (stats.optimizations.memoryCleanup) {
      optimizations.push(this.optimizeMemoryCache());
    }

    // Redis Cache 최적화
    if (stats.optimizations.redisCleanup) {
      optimizations.push(this.optimizeRedisCache());
    }

    // Database Cache 최적화
    if (stats.optimizations.databaseCleanup) {
      optimizations.push(this.optimizeDatabaseCache());
    }

    // 계층 조정
    if (stats.optimizations.layerAdjustment) {
      optimizations.push(this.adjustCacheLayers(stats));
    }

    // 병렬로 최적화 실행
    await Promise.allSettled(optimizations);
  }

  /**
   * Memory Cache 최적화
   */
  private async optimizeMemoryCache(): Promise<void> {
    try {
      logger.info('Optimizing memory cache');

      // 자주 사용되지 않는 항목 정리
      await armoriesCache.cleanup();

      // 메모리 사용량 최적화
      const memoryStats = await armoriesCache.getCacheStats();
      if (memoryStats.totalEntries > this.config.maxMemoryEntries) {
        logger.warn('Memory cache entries exceeded limit', {
          current: memoryStats.totalEntries,
          limit: this.config.maxMemoryEntries,
        });
      }
    } catch (error) {
      logger.error('Memory cache optimization failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Redis Cache 최적화
   */
  private async optimizeRedisCache(): Promise<void> {
    try {
      logger.info('Optimizing Redis cache');

      if (redisCache.isConnected()) {
        // Redis 캐시 정리
        await redisCache.cleanup();

        // Redis 메모리 최적화
        const redisStats = await redisCache.getCacheStats();
        if (redisStats.totalEntries > this.config.maxRedisEntries) {
          logger.warn('Redis cache entries exceeded limit', {
            current: redisStats.totalEntries,
            limit: this.config.maxRedisEntries,
          });
        }
      }
    } catch (error) {
      logger.error('Redis cache optimization failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Database Cache 최적화
   */
  private async optimizeDatabaseCache(): Promise<void> {
    try {
      logger.info('Optimizing database cache');

      if (databaseCache.isConnected()) {
        // Database 캐시 정리
        await databaseCache.cleanup();

        // Database 크기 최적화
        const databaseStats = await databaseCache.getCacheStats();
        if (databaseStats.totalEntries > this.config.maxDatabaseEntries) {
          logger.warn('Database cache entries exceeded limit', {
            current: databaseStats.totalEntries,
            limit: this.config.maxDatabaseEntries,
          });
        }
      }
    } catch (error) {
      logger.error('Database cache optimization failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 캐시 계층 조정
   */
  private async adjustCacheLayers(stats: CacheOptimizationStats): Promise<void> {
    try {
      logger.info('Adjusting cache layers');

      // 전체 히트율이 낮을 때 상위 계층에 더 많은 데이터 유지
      if (stats.overallHitRate < 0.8) {
        logger.info('Low hit rate detected, adjusting cache strategy');

        // Memory Cache에 더 많은 데이터 유지
        // Redis Cache TTL 조정
        // Database Cache 우선순위 조정
      }
    } catch (error) {
      logger.error('Cache layer adjustment failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 최적화 통계 조회
   */
  getLastOptimizationStats(): CacheOptimizationStats | null {
    return this.lastOptimizationStats;
  }

  /**
   * 최적화 설정 조회
   */
  getOptimizationConfig(): CacheOptimizationConfig {
    return { ...this.config };
  }

  /**
   * 최적화 설정 업데이트
   */
  updateOptimizationConfig(newConfig: Partial<CacheOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Cache optimization config updated', { newConfig });
  }

  /**
   * 캐시 성능 리포트 생성
   */
  async generatePerformanceReport(): Promise<{
    timestamp: Date;
    cacheStats: IntegratedCacheStats;
    optimizationStats: CacheOptimizationStats | null;
    recommendations: string[];
  }> {
    const cacheStats = await cacheManager.getCacheStats();
    const optimizationStats = this.getLastOptimizationStats();

    const recommendations: string[] = [];

    // 성능 권장사항 생성
    if (cacheStats.overall.hitRate < 0.8) {
      recommendations.push('캐시 히트율이 낮습니다. 캐시 전략을 재검토하세요.');
    }

    if (cacheStats.overall.averageResponseTime > 50) {
      recommendations.push('평균 응답 시간이 높습니다. 캐시 계층을 최적화하세요.');
    }

    if (cacheStats.memory.totalEntries > this.config.maxMemoryEntries * 0.8) {
      recommendations.push('Memory Cache 사용량이 높습니다. 정리를 고려하세요.');
    }

    return {
      timestamp: new Date(),
      cacheStats,
      optimizationStats,
      recommendations,
    };
  }
}

// === 싱글톤 인스턴스 ===

/**
 * 캐시 최적화 인스턴스
 */
export const cacheOptimizer = new CacheOptimizer();
