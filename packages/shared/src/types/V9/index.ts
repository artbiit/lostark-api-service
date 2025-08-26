/**
 * @lostark-api: V9.0.0
 * @reference: https://developer-lostark.game.onstove.com/getting-started
 *
 * 로스트아크 API V9.0.0 타입 정의 통합 export
 * - 모든 V9.0.0 타입들을 한 곳에서 import할 수 있도록 제공
 */

// === 기본 타입 ===
export * from './base.js';

// === API별 타입 ===
export * from './armories.js';
export * from './auctions.js';
export * from './characters.js';
export * from './gamecontents.js';
export * from './markets.js';
export * from './news.js';

// === 버전 정보 ===
export const API_VERSION = 'V9.0.0' as const;
export type ApiVersion = typeof API_VERSION;
