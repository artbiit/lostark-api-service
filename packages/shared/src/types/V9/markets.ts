/**
 * @lostark-api: V9.0.0
 * @reference: https://developer-lostark.game.onstove.com/getting-started#API-MARKETS
 *
 * 로스트아크 API V9.0.0 MARKETS API 타입 정의
 * - 시장 검색 옵션
 * - 아이템 ID로 시장 정보 조회
 * - 아이템 검색
 */

import {
  ApiVersion,
  BaseItem,
  ItemOption,
  MarketInfo,
  MarketSort,
  PaginationInfo,
  SortCondition,
} from './base.js';

// === 시장 검색 옵션 API ===

/**
 * 시장 검색 옵션 응답
 */
export interface MarketOptionsV9 extends ApiVersion {
  MaxItemLevel: number;
  ItemGradeQualities: number[]; // [10, 20, 30, 40, 50, 60, 70, 80, 90]
  SkillOptions: MarketSkillOptionV9[];
}

/**
 * 시장 스킬 옵션 정보
 */
export interface MarketSkillOptionV9 {
  Value: number;
  Class: string;
  Text: string;
  IsSkillGroup: boolean;
  Tripods: MarketTripodOptionV9[];
}

/**
 * 시장 트라이포드 옵션 정보
 */
export interface MarketTripodOptionV9 {
  Value: number;
  Text: string;
  IsGem: boolean;
  Tiers: number[]; // [2, 3, 4]
}

// === 시장 아이템 검색 API ===

/**
 * 시장 아이템 검색 요청
 */
export interface MarketSearchRequestV9 {
  CategoryCode: number;
  Sort: MarketSort;
  SortCondition: SortCondition;
  ItemName?: string;
  PageNo: number;
  ItemGrade?: string;
  ItemTier?: number;
  ItemLevelMin?: number;
  ItemLevelMax?: number;
  SkillOptions?: number[];
  EtcOptions?: number[];
  QualityValue?: number;
  EnableSkillOptionFilter?: boolean;
  EnableEtcOptionFilter?: boolean;
}

/**
 * 시장 아이템 정보
 */
export interface MarketItemV9 extends BaseItem, ApiVersion {
  MarketInfo: MarketInfo;
  Options: ItemOption[];
}

/**
 * 시장 아이템 검색 응답
 */
export interface MarketSearchResponseV9 extends PaginationInfo, ApiVersion {
  Items: MarketItemV9[];
}

// === 아이템 ID로 시장 정보 조회 API ===

/**
 * 아이템 ID로 시장 정보 조회 응답
 */
export interface MarketItemByIdResponseV9 extends ApiVersion {
  Item: MarketItemV9;
}

// === API 엔드포인트 타입 ===

/**
 * MARKETS API 엔드포인트
 */
export const MARKETS_ENDPOINTS = {
  OPTIONS: '/markets/options',
  ITEMS: '/markets/items',
  ITEM_BY_ID: '/markets/items/{itemId}',
} as const;

export type MarketEndpoint = (typeof MARKETS_ENDPOINTS)[keyof typeof MARKETS_ENDPOINTS];

// === 현재 버전 별칭 ===

/**
 * 현재 버전 타입 별칭
 */
export type MarketOptions = MarketOptionsV9;
export type MarketSearchRequest = MarketSearchRequestV9;
export type MarketItem = MarketItemV9;
export type MarketSearchResponse = MarketSearchResponseV9;
export type MarketItemByIdResponse = MarketItemByIdResponseV9;
export type MarketSkillOption = MarketSkillOptionV9;
export type MarketTripodOption = MarketTripodOptionV9;
