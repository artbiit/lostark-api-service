/**
 * @cursor-change: 2025-01-27, v1.0.0, AUCTIONS API 서비스 구현
 *
 * Lost Ark API V9.0.0 AUCTIONS API 서비스
 * - 경매장 검색 옵션 조회
 * - 경매장 아이템 검색
 */

import type { AuctionSearchRequestV9 } from '@lostark/shared/types/V9/auctions.js';
import { AuctionsCache } from '../cache/auctions-cache.js';
import { AuctionsClient } from '../clients/auctions-client.js';
import type {
  NormalizedAuctionOptions,
  NormalizedAuctionSearchResult,
} from '../normalizers/auctions-normalizer.js';
import { AuctionsNormalizer } from '../normalizers/auctions-normalizer.js';

/**
 * AUCTIONS API 서비스 클래스
 */
export class AuctionsService {
  private client: AuctionsClient;
  private cache: AuctionsCache;

  constructor() {
    this.client = new AuctionsClient();
    this.cache = AuctionsCache.getInstance();
  }

  /**
   * 경매장 검색 옵션 조회 (캐시 우선)
   */
  async getOptions(): Promise<NormalizedAuctionOptions> {
    // 캐시에서 먼저 조회
    const cached = await this.cache.getOptions();
    if (cached) {
      return cached;
    }

    // API 호출
    const data = await this.client.getOptions();
    const normalized = AuctionsNormalizer.normalizeOptions(data);

    // 캐시에 저장
    await this.cache.setOptions(data, normalized);

    return normalized;
  }

  /**
   * 경매장 아이템 검색 (캐시 우선)
   */
  async searchItems(request: AuctionSearchRequestV9): Promise<NormalizedAuctionSearchResult> {
    // 캐시에서 먼저 조회
    const cached = await this.cache.getSearchResult(request);
    if (cached) {
      return cached;
    }

    // API 호출
    const data = await this.client.searchItems(request);
    const normalized = AuctionsNormalizer.normalizeSearchResult(data);

    // 캐시에 저장
    await this.cache.setSearchResult(request, data, normalized);

    return normalized;
  }

  /**
   * 경매장 아이템 검색 (간단한 검색)
   */
  async searchItemsSimple(
    itemName: string,
    pageNo: number = 1,
    categoryCode?: number,
  ): Promise<NormalizedAuctionSearchResult> {
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
  ): Promise<NormalizedAuctionSearchResult> {
    const defaultRequest: AuctionSearchRequestV9 = {
      CategoryCode: 0,
      Sort: 'BUY_PRICE' as any,
      SortCondition: 'ASC' as any,
      PageNo: 1,
    };

    const finalRequest = { ...defaultRequest, ...request };
    return this.searchItems(finalRequest);
  }

  /**
   * 경매장 아이템 검색 (가격 범위)
   */
  async searchItemsByPriceRange(
    itemName: string,
    minPrice: number,
    maxPrice: number,
    pageNo: number = 1,
  ): Promise<NormalizedAuctionSearchResult> {
    const request: AuctionSearchRequestV9 = {
      CategoryCode: 0,
      Sort: 'BUY_PRICE' as any,
      SortCondition: 'ASC' as any,
      ItemName: itemName,
      PageNo: pageNo,
      // 가격 필터링은 클라이언트에서 처리
    };

    const result = await this.searchItems(request);

    // 가격 범위 필터링
    const filteredItems = result.items.filter(
      (item) => item.auctionInfo.buyPrice >= minPrice && item.auctionInfo.buyPrice <= maxPrice,
    );

    return {
      ...result,
      items: filteredItems,
      totalCount: filteredItems.length,
    };
  }

  /**
   * 경매장 아이템 검색 (등급별)
   */
  async searchItemsByGrade(
    itemName: string,
    grade: string,
    pageNo: number = 1,
  ): Promise<NormalizedAuctionSearchResult> {
    const request: AuctionSearchRequestV9 = {
      CategoryCode: 0,
      Sort: 'BUY_PRICE' as any,
      SortCondition: 'ASC' as any,
      ItemName: itemName,
      ItemGrade: grade,
      PageNo: pageNo,
    };

    return this.searchItems(request);
  }

  /**
   * 캐시 통계 조회
   */
  getCacheStats(): { optionsCacheSize: number; searchCacheSize: number } {
    return this.cache.getStats();
  }

  /**
   * 캐시 정리
   */
  cleanupCache(): void {
    this.cache.cleanup();
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.cache.clear();
  }
}
