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
export { charactersCache } from './cache/characters-cache.js';
export { CharactersClient } from './clients/characters-client.js';
export { CharactersNormalizer } from './normalizers/characters-normalizer.js';
export { CharactersService } from './services/characters-service.js';
export { armoriesCache } from './cache/armories-cache.js';
export { ArmoriesClient } from './clients/armories-client.js';
export { ArmoriesNormalizer } from './normalizers/armories-normalizer.js';
export { ArmoriesService } from './services/armories-service.js';
export { AuctionsCache } from './cache/auctions-cache.js';
export { AuctionsClient } from './clients/auctions-client.js';
export { AuctionsNormalizer } from './normalizers/auctions-normalizer.js';
export { AuctionsService } from './services/auctions-service.js';
export { NewsCache } from './cache/news-cache.js';
export { NewsClient } from './clients/news-client.js';
export { NewsNormalizer } from './normalizers/news-normalizer.js';
export { NewsService } from './services/news-service.js';
export { GameContentsClient } from './clients/gamecontents-client.js';
export { MarketsClient } from './clients/markets-client.js';
export { cacheManager } from './cache/cache-manager.js';
export { cacheOptimizer } from './cache/cache-optimizer.js';
export { databaseCache } from './cache/database-cache.js';
export { redisCache } from './cache/redis-cache.js';
export * from './config.js';
export type { IntegratedCacheStats } from './cache/cache-manager.js';
export type { ArmoriesQueueItem } from './services/armories-service.js';
/**
 * Redis 연결 초기화
 */
export declare function initializeRedis(): Promise<void>;
/**
 * Redis 연결 해제
 */
export declare function disconnectRedis(): Promise<void>;
/**
 * MySQL 연결 초기화
 */
export declare function initializeMySQL(): Promise<void>;
/**
 * MySQL 연결 해제
 */
export declare function disconnectMySQL(): Promise<void>;
