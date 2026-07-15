/**
 * @cursor-change: 2025-01-27, v1.0.1, data-service index 업데이트 - 모든 API 통합
 *
 * Data Service 메인 엔트리 포인트
 * - CHARACTERS API: 캐릭터 기본 정보 조회
 * - ARMORIES API: 캐릭터 상세 정보 조회
 * - AUCTIONS API: 경매장 검색
 * - NEWS API: 공지사항 및 이벤트
 * - GAMECONTENTS API: 주간 콘텐츠 달력
 * - MARKETS API: 시장 정보
 * - Redis 캐시: 3계층 캐싱 구조 지원
 * - dotenv를 통한 일관된 환경변수 로딩
 */

logger.info('📦 data-service 패키지 로딩 시작');

logger.info('📥 shared 패키지 import 시작...');
import { logger, migrationManager } from '@lostark/shared';
import { pgClient } from '@lostark/shared/db/postgres';
import { redisClient } from '@lostark/shared/db/redis';
logger.info('✅ logger import 완료');

logger.info('📥 PostgreSQL 클라이언트 import 시작...');
logger.info('✅ PostgreSQL 클라이언트 import 완료');

logger.info('📥 Redis 클라이언트 import 시작...');
logger.info('✅ Redis 클라이언트 import 완료');

// === 환경변수 로딩 ===
// parseEnv() 함수는 필요할 때만 호출하도록 수정
// const env = parseEnv();

// === CHARACTERS API ===
export { charactersCache } from './cache/characters-cache.js';
export { CharactersClient } from './clients/characters-client.js';
export { CharactersNormalizer } from './normalizers/characters-normalizer.js';
export { CharactersService, charactersService } from './services/characters-service.js';

// === ARMORIES API ===
export { armoriesCache } from './cache/armories-cache.js';
export { ArmoriesClient } from './clients/armories-client.js';
export { ArmoriesNormalizer } from './normalizers/armories-normalizer.js';
export type {
  NormalizedCharacterDetail,
  NormalizedArkPassive,
  NormalizedAbilityStone,
  NormalizedAbilityStoneEffect,
  AbilityStoneEffectKind,
  NormalizationResult,
} from './normalizers/armories-normalizer.js';
export { ArmoriesService, armoriesService } from './services/armories-service.js';

// === AUCTIONS API ===
export { AuctionsCache } from './cache/auctions-cache.js';
export { AuctionsClient } from './clients/auctions-client.js';
export { AuctionsNormalizer } from './normalizers/auctions-normalizer.js';
export { AuctionsService } from './services/auctions-service.js';

// === NEWS API ===
export { NewsClient } from './clients/news-client.js';
export { NewsNormalizer } from './normalizers/news-normalizer.js';
export { NewsService } from './services/news-service.js';
export {
  NewsCacheManager,
  newsCacheManager,
  NEWS_NOTICES_DEFAULT_CACHE_KEY,
  NEWS_EVENTS_CACHE_KEY,
  buildNoticesCacheKey,
} from './cache/news-cache-manager.js';

// === GAMECONTENTS API ===
export { GameContentsClient } from './clients/gamecontents-client.js';
export { GameContentsService } from './services/gamecontents-service.js';
export {
  GameContentsCacheManager,
  gameContentsCacheManager,
  GAMECONTENTS_CALENDAR_CACHE_KEY,
} from './cache/gamecontents-cache-manager.js';

// === 도메인 3-tier 캐시 인프라 ===
export { DomainCacheManager, MaintenanceUnavailableError } from './cache/domain-cache-manager.js';
export type {
  CacheLookupResult,
  CacheTierTtl,
  CacheRefreshOutcome,
} from './cache/domain-cache-manager.js';
export {
  DatabaseDomainCache,
  databaseDomainCache,
  startDomainCacheCleanupScheduler,
} from './cache/database-domain-cache.js';
export type { DomainCacheType, DomainCacheRow } from './cache/database-domain-cache.js';
export { RedisDomainCache, redisDomainCache } from './cache/redis-domain-cache.js';
export { warmupDomainCaches } from './cache/warmup.js';
export type { WarmupReport, WarmupOptions } from './cache/warmup.js';
export {
  startCalendarRefreshScheduler,
  computeMsUntilNextReset,
} from './cache/calendar-refresh-scheduler.js';
export type { CalendarRefreshSchedulerHandle } from './cache/calendar-refresh-scheduler.js';

// === MARKETS API ===
export { MarketsClient } from './clients/markets-client.js';
export { MarketsService } from './services/markets-service.js';

// === 캐시 시스템 ===
export { cacheManager } from './cache/cache-manager.js';
export { cacheOptimizer } from './cache/cache-optimizer.js';
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
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to initialize Redis connection',
    );
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
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to disconnect Redis connection',
    );
  }
}

// === PostgreSQL 연결 초기화 ===

/**
 * PostgreSQL 연결 초기화
 */
export async function initializePostgres(): Promise<void> {
  try {
    await pgClient.connect();
    logger.info('PostgreSQL connection initialized successfully');
    await migrationManager.migrate();
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to initialize PostgreSQL connection',
    );
    // PostgreSQL 연결 실패 시에도 서비스는 계속 동작 (Memory/Redis Cache만 사용)
  }
}

/**
 * PostgreSQL 연결 해제
 */
export async function disconnectPostgres(): Promise<void> {
  try {
    await pgClient.disconnect();
    logger.info('PostgreSQL connection disconnected successfully');
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to disconnect PostgreSQL connection',
    );
  }
}
