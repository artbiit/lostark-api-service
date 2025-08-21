/**
 * @lostark-api: V9.0.0 (현재 최신)
 * @reference: https://developer-lostark.game.onstove.com/getting-started
 *
 * 현재 최신 버전의 로스트아크 API 타입 정의
 * - V9.0.0을 latest로 설정
 * - 향후 새 버전 출시 시 이 파일을 업데이트하여 최신 버전을 가리키도록 함
 */

// V9.0.0을 현재 최신 버전으로 설정
export * from '../V9/index.js';

// === 버전 정보 ===
export const LATEST_API_VERSION = 'V9.0.0' as const;
export type LatestApiVersion = typeof LATEST_API_VERSION;
