/**
 * @lostark-api: V9.0.0
 * @reference: https://developer-lostark.game.onstove.com/getting-started#API-AUCTIONS
 *
 * 로스트아크 API V9.0.0 AUCTIONS API 타입 정의
 * - 경매장 검색 옵션
 * - 경매장 아이템 검색
 */

import { ApiVersion, BaseItem, ItemOption, AuctionInfo, PaginationInfo, AuctionSort, SortCondition, ClassName } from './base.js';

// === 경매장 검색 옵션 API ===

/**
 * 경매장 검색 옵션 응답
 */
export interface AuctionOptionsV9 extends ApiVersion {
  MaxItemLevel: number;
  ItemGradeQualities: number[]; // [10, 20, 30, 40, 50, 60, 70, 80, 90]
  SkillOptions: SkillOptionV9[];
}

/**
 * 스킬 옵션 정보
 */
export interface SkillOptionV9 {
  Value: number;
  Class: ClassName;
  Text: string;
  IsSkillGroup: boolean;
  Tripods: TripodOptionV9[];
}

/**
 * 트라이포드 옵션 정보
 */
export interface TripodOptionV9 {
  Value: number;
  Text: string;
  IsGem: boolean;
  Tiers: number[]; // [2, 3, 4]
}

// === 경매장 아이템 검색 API ===

/**
 * 경매장 아이템 검색 요청
 */
export interface AuctionSearchRequestV9 {
  CategoryCode: number;
  Sort: AuctionSort;
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
 * 경매장 아이템 정보
 */
export interface AuctionItemV9 extends BaseItem, ApiVersion {
  AuctionInfo: AuctionInfo;
  Options: ItemOption[];
}

/**
 * 경매장 아이템 검색 응답
 */
export interface AuctionSearchResponseV9 extends PaginationInfo, ApiVersion {
  Items: AuctionItemV9[];
}

// === API 엔드포인트 타입 ===

/**
 * AUCTIONS API 엔드포인트
 */
export const AUCTIONS_ENDPOINTS = {
  OPTIONS: '/auctions/options',
  ITEMS: '/auctions/items',
} as const;

export type AuctionEndpoint = typeof AUCTIONS_ENDPOINTS[keyof typeof AUCTIONS_ENDPOINTS];

// === 현재 버전 별칭 ===

/**
 * 현재 버전 타입 별칭
 */
export type AuctionOptions = AuctionOptionsV9;
export type AuctionSearchRequest = AuctionSearchRequestV9;
export type AuctionItem = AuctionItemV9;
export type AuctionSearchResponse = AuctionSearchResponseV9;
export type SkillOption = SkillOptionV9;
export type TripodOption = TripodOptionV9;
