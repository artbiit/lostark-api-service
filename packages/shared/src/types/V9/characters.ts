/**
 * @lostark-api: V9.0.0
 * @reference: https://developer-lostark.game.onstove.com/getting-started#API-CHARACTERS
 *
 * 로스트아크 API V9.0.0 CHARACTERS API 타입 정의
 * - 캐릭터 형제 정보 (계정의 모든 캐릭터)
 */

import { ApiVersion, ServerName, ClassName } from './base.js';

// === 캐릭터 형제 정보 API ===

/**
 * 캐릭터 기본 정보
 */
export interface CharacterSiblingV9 extends ApiVersion {
  ServerName: ServerName;
  CharacterName: string;
  CharacterLevel: number;
  CharacterClassName: ClassName;
  ItemAvgLevel: string; // 쉼표가 포함된 문자열 (예: "1,460.00")
}

/**
 * 캐릭터 형제 정보 응답
 */
export type CharacterSiblingsResponseV9 = CharacterSiblingV9[];

// === API 엔드포인트 타입 ===

/**
 * CHARACTERS API 엔드포인트
 */
export const CHARACTERS_ENDPOINTS = {
  SIBLINGS: (characterName: string) => `/characters/${characterName}/siblings`,
} as const;

// === 현재 버전 별칭 ===

/**
 * 현재 버전 타입 별칭
 */
export type CharacterSibling = CharacterSiblingV9;
export type CharacterSiblingsResponse = CharacterSiblingsResponseV9;
