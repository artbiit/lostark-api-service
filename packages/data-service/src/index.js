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
import { logger } from '@lostark/shared';
import { parseEnv } from '@lostark/shared/config/env.js';
import { mysqlClient } from '@lostark/shared/db/mysql.js';
import { redisClient } from '@lostark/shared/db/redis.js';
// === 환경변수 로딩 ===
// parseEnv() 함수가 자동으로 .env 파일을 로드합니다
const env = parseEnv();
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
// === AUCTIONS API ===
export { AuctionsCache } from './cache/auctions-cache.js';
export { AuctionsClient } from './clients/auctions-client.js';
export { AuctionsNormalizer } from './normalizers/auctions-normalizer.js';
export { AuctionsService } from './services/auctions-service.js';
// === NEWS API ===
export { NewsCache } from './cache/news-cache.js';
export { NewsClient } from './clients/news-client.js';
export { NewsNormalizer } from './normalizers/news-normalizer.js';
export { NewsService } from './services/news-service.js';
// === GAMECONTENTS API ===
export { GameContentsClient } from './clients/gamecontents-client.js';
// === MARKETS API ===
export { MarketsClient } from './clients/markets-client.js';
// === 캐시 시스템 ===
export { cacheManager } from './cache/cache-manager.js';
export { cacheOptimizer } from './cache/cache-optimizer.js';
export { databaseCache } from './cache/database-cache.js';
export { redisCache } from './cache/redis-cache.js';
// === 공통 모듈 ===
export * from './config.js';
// === Redis 연결 초기화 ===
/**
 * Redis 연결 초기화
 */
export async function initializeRedis() {
    try {
        await redisClient.connect();
        logger.info('Redis connection initialized successfully');
    }
    catch (error) {
        logger.error('Failed to initialize Redis connection', {
            error: error instanceof Error ? error.message : String(error),
        });
        // Redis 연결 실패 시에도 서비스는 계속 동작 (Memory Cache만 사용)
    }
}
/**
 * Redis 연결 해제
 */
export async function disconnectRedis() {
    try {
        await redisClient.disconnect();
        logger.info('Redis connection disconnected successfully');
    }
    catch (error) {
        logger.error('Failed to disconnect Redis connection', {
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
// === MySQL 연결 초기화 ===
/**
 * MySQL 연결 초기화
 */
export async function initializeMySQL() {
    try {
        await mysqlClient.connect();
        logger.info('MySQL connection initialized successfully');
    }
    catch (error) {
        logger.error('Failed to initialize MySQL connection', {
            error: error instanceof Error ? error.message : String(error),
        });
        // MySQL 연결 실패 시에도 서비스는 계속 동작 (Memory/Redis Cache만 사용)
    }
}
/**
 * MySQL 연결 해제
 */
export async function disconnectMySQL() {
    try {
        await mysqlClient.disconnect();
        logger.info('MySQL connection disconnected successfully');
    }
    catch (error) {
        logger.error('Failed to disconnect MySQL connection', {
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
