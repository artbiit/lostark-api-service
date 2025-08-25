/**
 * @cursor-change: 2025-01-27, v1.0.0, data-service index 생성
 *
 * Data Service 메인 엔트리 포인트
 * - CHARACTERS API: 캐릭터 기본 정보 조회
 * - ARMORIES API: 캐릭터 상세 정보 조회
 * - Redis 캐시: 3계층 캐싱 구조 지원
 */

import { logger } from '@lostark/shared';
import { mysqlClient } from '@lostark/shared/db/mysql.js';
import { redisClient } from '@lostark/shared/db/redis.js';

// === CHARACTERS API ===
export { charactersCache } from './cache/characters-cache.js';
export { CharactersClient } from './clients/characters-client.js';
export { CharactersNormalizer } from './normalizers/characters-normalizer.js';
export { CharactersService } from './services/characters-service.js';

// === ARMORIES API ===
export { armoriesCache } from './cache/armories-cache.js';
export { ArmoriesClient } from './clients/armories-client.js';
export { ArmoriesNormalizer } from './normalizers/armories-normalizer.js';
export { ArmoriesService } from './services/armories-service.js';

// === 캐시 시스템 ===
export { cacheManager } from './cache/cache-manager.js';
export { databaseCache } from './cache/database-cache.js';
export { redisCache } from './cache/redis-cache.js';

// === 공통 모듈 ===
export * from './config.js';

// === 타입 export ===
export type { IntegratedCacheStats } from './cache/cache-manager.js';
export type { ArmoriesQueueItem } from './services/armories-service.js';

// === Redis 연결 초기화 ===

/**
 * Redis 연결 초기화
 */
export async function initializeRedis(): Promise<void> {
  try {
    await redisClient.connect();
    logger.info('Redis connection initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Redis connection', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Redis 연결 실패 시에도 서비스는 계속 동작 (Memory Cache만 사용)
  }
}

/**
 * Redis 연결 해제
 */
export async function disconnectRedis(): Promise<void> {
  try {
    await redisClient.disconnect();
    logger.info('Redis connection disconnected successfully');
  } catch (error) {
    logger.error('Failed to disconnect Redis connection', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// === MySQL 연결 초기화 ===

/**
 * MySQL 연결 초기화
 */
export async function initializeMySQL(): Promise<void> {
  try {
    await mysqlClient.connect();
    logger.info('MySQL connection initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize MySQL connection', {
      error: error instanceof Error ? error.message : String(error),
    });
    // MySQL 연결 실패 시에도 서비스는 계속 동작 (Memory/Redis Cache만 사용)
  }
}

/**
 * MySQL 연결 해제
 */
export async function disconnectMySQL(): Promise<void> {
  try {
    await mysqlClient.disconnect();
    logger.info('MySQL connection disconnected successfully');
  } catch (error) {
    logger.error('Failed to disconnect MySQL connection', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
