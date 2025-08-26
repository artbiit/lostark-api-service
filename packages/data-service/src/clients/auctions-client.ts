/**
 * @cursor-change: 2025-01-27, v1.0.0, AUCTIONS API 클라이언트 구현
 *
 * Lost Ark API V9.0.0 AUCTIONS API 클라이언트
 * - 경매장 검색 옵션 조회
 * - 경매장 아이템 검색
 */

import type {
  AuctionOptionsV9,
  AuctionSearchRequestV9,
  AuctionSearchResponseV9,
} from '@lostark/shared/types/V9/auctions.js';
import { AUCTIONS_ENDPOINTS } from '@lostark/shared/types/V9/auctions.js';
import { ApiClient } from './api-client.js';

/**
 * AUCTIONS API 클라이언트
 */
export class AuctionsClient extends ApiClient {
  /**
   * 경매장 검색 옵션 조회
   */
  async getOptions(): Promise<AuctionOptionsV9> {
    return this.get<AuctionOptionsV9>(AUCTIONS_ENDPOINTS.OPTIONS);
  }

  /**
   * 경매장 아이템 검색
   */
  async searchItems(request: AuctionSearchRequestV9): Promise<AuctionSearchResponseV9> {
    return this.post<AuctionSearchResponseV9>(AUCTIONS_ENDPOINTS.ITEMS, request);
  }

  /**
   * 경매장 아이템 검색 (간단한 검색)
   */
  async searchItemsSimple(
    itemName: string,
    pageNo: number = 1,
    categoryCode?: number,
  ): Promise<AuctionSearchResponseV9> {
    const request: AuctionSearchRequestV9 = {
      CategoryCode: categoryCode || 0,
      Sort: 'BUY_PRICE' as any,
      SortCondition: 'ASC' as any,
      ItemName: itemName,
      PageNo: pageNo,
    };

    return this.searchItems(request);
  }

  /**
   * 경매장 아이템 검색 (고급 검색)
   */
  async searchItemsAdvanced(
    request: Partial<AuctionSearchRequestV9> & { PageNo: number },
  ): Promise<AuctionSearchResponseV9> {
    const defaultRequest: AuctionSearchRequestV9 = {
      CategoryCode: 0,
      Sort: 'BUY_PRICE' as any,
      SortCondition: 'ASC' as any,
      PageNo: 1,
    };

    const finalRequest = { ...defaultRequest, ...request };
    return this.searchItems(finalRequest);
  }
}
