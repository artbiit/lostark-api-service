/**
 * @cursor-change: 2025-01-27, v1.0.0, MARKETS API 클라이언트 구현
 *
 * Lost Ark API V9.0.0 MARKETS API 클라이언트
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
import { MARKETS_ENDPOINTS } from '@lostark/shared/types/V9/markets.js';
import { ApiClient } from './api-client.js';

/**
 * MARKETS API 클라이언트
 */
export class MarketsClient extends ApiClient {
  /**
   * 시장 검색 옵션 조회
   */
  async getOptions(): Promise<MarketOptionsV9> {
    return this.get<MarketOptionsV9>(MARKETS_ENDPOINTS.OPTIONS);
  }

  /**
   * 시장 아이템 검색
   */
  async searchItems(request: MarketSearchRequestV9): Promise<MarketSearchResponseV9> {
    return this.post<MarketSearchResponseV9>(MARKETS_ENDPOINTS.ITEMS, request);
  }

  /**
   * 아이템 ID로 시장 정보 조회
   */
  async getItemById(itemId: number): Promise<MarketItemByIdResponseV9> {
    const url = MARKETS_ENDPOINTS.ITEM_BY_ID.replace('{itemId}', itemId.toString());
    return this.get<MarketItemByIdResponseV9>(url);
  }

  /**
   * 시장 아이템 검색 (간단한 검색)
   */
  async searchItemsSimple(
    itemName: string,
    pageNo: number = 1,
    categoryCode?: number,
  ): Promise<MarketSearchResponseV9> {
    const request: MarketSearchRequestV9 = {
      CategoryCode: categoryCode || 0,
      Sort: 'BUY_PRICE' as any,
      SortCondition: 'ASC' as any,
      ItemName: itemName,
      PageNo: pageNo,
    };

    return this.searchItems(request);
  }

  /**
   * 시장 아이템 검색 (고급 검색)
   */
  async searchItemsAdvanced(
    request: Partial<MarketSearchRequestV9> & { PageNo: number },
  ): Promise<MarketSearchResponseV9> {
    const defaultRequest: MarketSearchRequestV9 = {
      CategoryCode: 0,
      Sort: 'BUY_PRICE' as any,
      SortCondition: 'ASC' as any,
      PageNo: 1,
    };

    const finalRequest = { ...defaultRequest, ...request };
    return this.searchItems(finalRequest);
  }
}
