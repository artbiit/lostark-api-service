/**
 * @cursor-change: 2025-01-27, v1.0.0, MARKETS API 서비스 구현
 *
 * Lost Ark API V9.0.0 MARKETS API 서비스
 * - 시장 검색 옵션 조회
 * - 아이템 ID로 시장 정보 조회
 * - 아이템 검색
 */

import type {
  MarketItemByIdResponseV9,
  MarketOptionsV9,
  MarketSearchRequestV9,
  MarketSearchResponseV9,
} from '@lostark/shared/types/V9/markets.js';
import { MarketSort, SortCondition } from '@lostark/shared/types/V9/base.js';
import { MarketsClient } from '../clients/markets-client.js';

/**
 * MARKETS API 서비스 클래스
 */
export class MarketsService {
  private client: MarketsClient;

  constructor() {
    this.client = new MarketsClient();
  }

  /**
   * 시장 검색 옵션 조회
   */
  async getOptions(): Promise<MarketOptionsV9> {
    return this.client.getOptions();
  }

  /**
   * 시장 아이템 검색
   */
  async searchItems(request: MarketSearchRequestV9): Promise<MarketSearchResponseV9> {
    return this.client.searchItems(request);
  }

  /**
   * 아이템 ID로 시장 정보 조회
   */
  async getItemById(itemId: number): Promise<MarketItemByIdResponseV9> {
    return this.client.getItemById(itemId);
  }

  /**
   * 시장 아이템 검색 (간단한 검색)
   */
  async searchItemsSimple(
    itemName: string,
    pageNo: number = 1,
    categoryCode?: number,
  ): Promise<MarketSearchResponseV9> {
    return this.client.searchItemsSimple(itemName, pageNo, categoryCode);
  }

  /**
   * 시장 아이템 검색 (고급 검색)
   */
  async searchItemsAdvanced(
    request: Partial<MarketSearchRequestV9> & { PageNo: number },
  ): Promise<MarketSearchResponseV9> {
    return this.client.searchItemsAdvanced(request);
  }

  /**
   * 특정 카테고리 아이템 검색
   */
  async searchItemsByCategory(
    categoryCode: number,
    pageNo: number = 1,
  ): Promise<MarketSearchResponseV9> {
    const request: MarketSearchRequestV9 = {
      CategoryCode: categoryCode,
      Sort: 'BUY_PRICE' as any,
      SortCondition: 'ASC' as any,
      PageNo: pageNo,
    };

    return this.searchItems(request);
  }

  /**
   * 가격순 정렬로 아이템 검색
   */
  async searchItemsByPrice(
    itemName: string,
    sortCondition: SortCondition = SortCondition.ASC,
    pageNo: number = 1,
  ): Promise<MarketSearchResponseV9> {
    const request: MarketSearchRequestV9 = {
      CategoryCode: 0,
      Sort: 'BUY_PRICE' as MarketSort,
      SortCondition: sortCondition,
      ItemName: itemName,
      PageNo: pageNo,
    };

    return this.searchItems(request);
  }
}
