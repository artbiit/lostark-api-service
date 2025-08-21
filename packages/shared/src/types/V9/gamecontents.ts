/**
 * @lostark-api: V9.0.0
 * @reference: https://developer-lostark.game.onstove.com/getting-started#API-GAMECONTENTS
 *
 * 로스트아크 API V9.0.0 GAMECONTENTS API 타입 정의
 * - 도비스 던전 목록
 * - 도가토 목록
 * - 주간 콘텐츠 달력 (프로키온의 나침반)
 */

import { ApiVersion, ItemGrade } from './base.js';

// === 공통 게임 콘텐츠 타입 ===

/**
 * 게임 콘텐츠 기본 정보
 */
export interface GameContentV9 extends ApiVersion {
  CategoryName: string;
  ContentsName: string;
  ContentsIcon: string;
  MinItemLevel: number;
  StartTimes: string[]; // ISO 8601 형식 배열
  Location: string;
  RewardItems: RewardItemGroupV9[];
}

/**
 * 보상 아이템 그룹
 */
export interface RewardItemGroupV9 {
  ItemLevel: number;
  Items: RewardItemV9[];
}

/**
 * 보상 아이템
 */
export interface RewardItemV9 {
  Name: string;
  Icon: string;
  Grade: ItemGrade;
  StartTimes?: string[] | null; // ISO 8601 형식 배열
}

// === 도비스 던전 API ===

/**
 * 도비스 던전 정보
 */
export interface ChallengeAbyssDungeonV9 extends GameContentV9 {
  // 도비스 던전 특화 필드가 있다면 여기에 추가
}

/**
 * 도비스 던전 목록 응답
 */
export type ChallengeAbyssDungeonsResponseV9 = ChallengeAbyssDungeonV9[];

// === 도가토 API ===

/**
 * 도가토 정보
 */
export interface ChallengeGuardianRaidV9 extends GameContentV9 {
  // 도가토 특화 필드가 있다면 여기에 추가
}

/**
 * 도가토 목록 응답
 */
export type ChallengeGuardianRaidsResponseV9 = ChallengeGuardianRaidV9[];

// === 주간 콘텐츠 달력 API ===

/**
 * 주간 콘텐츠 달력 응답
 * 프로키온의 나침반, 로웬, 필드보스 등 모든 주간 콘텐츠
 */
export type GameContentsCalendarResponseV9 = GameContentV9[];

// === API 엔드포인트 타입 ===

/**
 * GAMECONTENTS API 엔드포인트
 */
export const GAMECONTENTS_ENDPOINTS = {
  CHALLENGE_ABYSS_DUNGEONS: '/gamecontents/challenge-abyss-dungeons',
  CHALLENGE_GUARDIAN_RAIDS: '/gamecontents/challenge-guardian-raids',
  CALENDAR: '/gamecontents/calendar',
} as const;

export type GameContentsEndpoint = typeof GAMECONTENTS_ENDPOINTS[keyof typeof GAMECONTENTS_ENDPOINTS];

// === 콘텐츠 카테고리 상수 ===

/**
 * 콘텐츠 카테고리
 */
export const CONTENT_CATEGORIES = {
  모험섬: '모험 섬',
  유령선: '유령선',
  필드보스: '필드보스',
  태초의섬: '태초의 섬',
  카오스게이트: '카오스게이트',
  로웬: '로웬',
  도비스: '도비스 던전',
  도가토: '도가토',
} as const;

export type ContentCategory = typeof CONTENT_CATEGORIES[keyof typeof CONTENT_CATEGORIES];

// === 현재 버전 별칭 ===

/**
 * 현재 버전 타입 별칭
 */
export type GameContent = GameContentV9;
export type RewardItemGroup = RewardItemGroupV9;
export type RewardItem = RewardItemV9;
export type ChallengeAbyssDungeon = ChallengeAbyssDungeonV9;
export type ChallengeGuardianRaid = ChallengeGuardianRaidV9;
export type ChallengeAbyssDungeonsResponse = ChallengeAbyssDungeonsResponseV9;
export type ChallengeGuardianRaidsResponse = ChallengeGuardianRaidsResponseV9;
export type GameContentsCalendarResponse = GameContentsCalendarResponseV9;
