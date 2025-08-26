/**
 * @cursor-change: 2025-01-27, v1.0.0, AUCTIONS API 정규화 모듈 구현
 *
 * Lost Ark API V9.0.0 AUCTIONS API 데이터 정규화
 * - 경매장 검색 옵션 정규화
 * - 경매장 아이템 검색 결과 정규화
 */

import type {
  AuctionItemV9,
  AuctionOptionsV9,
  AuctionSearchResponseV9,
  SkillOptionV9,
  TripodOptionV9,
} from '@lostark/shared/types/V9/auctions.js';

/**
 * 정규화된 경매장 검색 옵션
 */
export interface NormalizedAuctionOptions {
  maxItemLevel: number;
  itemGradeQualities: number[];
  skillOptions: NormalizedSkillOption[];
  normalizedAt: string;
}

/**
 * 정규화된 스킬 옵션
 */
export interface NormalizedSkillOption {
  value: number;
  class: string;
  text: string;
  isSkillGroup: boolean;
  tripods: NormalizedTripodOption[];
}

/**
 * 정규화된 트라이포드 옵션
 */
export interface NormalizedTripodOption {
  value: number;
  text: string;
  isGem: boolean;
  tiers: number[];
}

/**
 * 정규화된 경매장 아이템
 */
export interface NormalizedAuctionItem {
  id: number;
  name: string;
  icon: string;
  grade: string;
  tier: number;
  level: number;
  auctionInfo: {
    startPrice: number;
    buyPrice: number;
    bidPrice: number;
    endDate: string;
    bidCount: number;
    bidStartPrice: number;
    isCompetitive: boolean;
    tradeAllowCount: number;
  };
  options: Array<{
    type: string;
    optionName: string;
    optionNameTripod: string;
    value: number;
    isPenalty: boolean;
    className: string;
  }>;
  normalizedAt: string;
}

/**
 * 정규화된 경매장 검색 결과
 */
export interface NormalizedAuctionSearchResult {
  items: NormalizedAuctionItem[];
  totalCount: number;
  pageNo: number;
  pageSize: number;
  normalizedAt: string;
}

/**
 * AUCTIONS API 정규화 클래스
 */
export class AuctionsNormalizer {
  /**
   * 경매장 검색 옵션 정규화
   */
  static normalizeOptions(data: AuctionOptionsV9): NormalizedAuctionOptions {
    return {
      maxItemLevel: data.MaxItemLevel,
      itemGradeQualities: data.ItemGradeQualities,
      skillOptions: data.SkillOptions.map(this.normalizeSkillOption),
      normalizedAt: new Date().toISOString(),
    };
  }

  /**
   * 스킬 옵션 정규화
   */
  private static normalizeSkillOption(option: SkillOptionV9): NormalizedSkillOption {
    return {
      value: option.Value,
      class: option.Class,
      text: option.Text,
      isSkillGroup: option.IsSkillGroup,
      tripods: option.Tripods.map(this.normalizeTripodOption),
    };
  }

  /**
   * 트라이포드 옵션 정규화
   */
  private static normalizeTripodOption(option: TripodOptionV9): NormalizedTripodOption {
    return {
      value: option.Value,
      text: option.Text,
      isGem: option.IsGem,
      tiers: option.Tiers,
    };
  }

  /**
   * 경매장 검색 결과 정규화
   */
  static normalizeSearchResult(data: AuctionSearchResponseV9): NormalizedAuctionSearchResult {
    return {
      items: data.Items.map(this.normalizeAuctionItem),
      totalCount: data.TotalCount,
      pageNo: data.PageNo,
      pageSize: data.PageSize,
      normalizedAt: new Date().toISOString(),
    };
  }

  /**
   * 경매장 아이템 정규화
   */
  private static normalizeAuctionItem(item: AuctionItemV9): NormalizedAuctionItem {
    return {
      id: (item as any).Id || 0,
      name: item.Name,
      icon: item.Icon,
      grade: item.Grade,
      tier: item.Tier || 0,
      level: item.Level || 0,
      auctionInfo: {
        startPrice: item.AuctionInfo.StartPrice,
        buyPrice: item.AuctionInfo.BuyPrice,
        bidPrice: item.AuctionInfo.BidPrice,
        endDate: item.AuctionInfo.EndDate,
        bidCount: item.AuctionInfo.BidCount,
        bidStartPrice: item.AuctionInfo.BidStartPrice,
        isCompetitive: item.AuctionInfo.IsCompetitive,
        tradeAllowCount: item.AuctionInfo.TradeAllowCount,
      },
      options: item.Options.map((option) => ({
        type: option.Type,
        optionName: option.OptionName,
        optionNameTripod: option.OptionNameTripod || '',
        value: option.Value,
        isPenalty: option.IsPenalty,
        className: option.ClassName || '',
      })),
      normalizedAt: new Date().toISOString(),
    };
  }

  /**
   * 경매장 아이템 배열 정규화
   */
  static normalizeAuctionItems(items: AuctionItemV9[]): NormalizedAuctionItem[] {
    return items.map(this.normalizeAuctionItem);
  }
}
