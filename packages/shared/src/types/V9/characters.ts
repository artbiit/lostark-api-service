/**
 * @lostark-api: V9.0.0
 * @reference: https://developer-lostark.game.onstove.com/getting-started#API-CHARACTERS
 *
 * 로스트아크 API V9.0.0 CHARACTERS API 타입 정의
 * - 캐릭터 형제 정보 (계정의 모든 캐릭터)
 *
 * @deprecated CHARACTERS API는 ARMORIES API와 중복됩니다.
 * 캐릭터 정보는 /armories/characters/{name} 엔드포인트를 사용하세요.
 */

import { ApiVersion, ClassName, ServerName } from './base.js';

// === 캐릭터 형제 정보 API ===

/**
 * 캐릭터 기본 정보
 * @deprecated ARMORIES API의 캐릭터 정보를 사용하세요
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
 * @deprecated ARMORIES API의 캐릭터 정보를 사용하세요
 */
export type CharacterSiblingsResponseV9 = CharacterSiblingV9[];

// === API 엔드포인트 타입 ===

/**
 * CHARACTERS API 엔드포인트
 * @deprecated ARMORIES API 엔드포인트를 사용하세요: /armories/characters/{name}
 */
export const CHARACTERS_ENDPOINTS = {
  SIBLINGS: (characterName: string) => `/characters/${characterName}/siblings`,
} as const;

// === 현재 버전 별칭 ===

/**
 * 현재 버전 타입 별칭
 * @deprecated ARMORIES API 타입을 사용하세요
 */
export type CharacterSibling = CharacterSiblingV9;
export type CharacterSiblingsResponse = CharacterSiblingsResponseV9;
