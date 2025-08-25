/**
 * @cursor-change: 2025-01-27, v1.0.0, data-service index 생성
 *
 * Data Service 메인 엔트리 포인트
 * - CHARACTERS API: 캐릭터 기본 정보 조회
 * - ARMORIES API: 캐릭터 상세 정보 조회
 */

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

// === 공통 모듈 ===
export * from './config.js';

// === 타입 export ===
export type { ArmoriesQueueItem } from './services/armories-service.js';
