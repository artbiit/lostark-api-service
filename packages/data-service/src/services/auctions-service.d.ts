/**
 * @cursor-change: 2025-01-27, v1.0.0, AUCTIONS API 서비스 구현
 *
 * Lost Ark API V9.0.0 AUCTIONS API 서비스
 * - 경매장 검색 옵션 조회
 * - 경매장 아이템 검색
 */
import type { AuctionSearchRequestV9 } from '@lostark/shared/types/V9/auctions.js';
import type { NormalizedAuctionOptions, NormalizedAuctionSearchResult } from '../normalizers/auctions-normalizer.js';
/**
 * AUCTIONS API 서비스 클래스
 */
export declare class AuctionsService {
    private client;
    private cache;
    constructor();
    /**
     * 경매장 검색 옵션 조회 (캐시 우선)
     */
    getOptions(): Promise<NormalizedAuctionOptions>;
    /**
     * 경매장 아이템 검색 (캐시 우선)
     */
    searchItems(request: AuctionSearchRequestV9): Promise<NormalizedAuctionSearchResult>;
    /**
     * 경매장 아이템 검색 (간단한 검색)
     */
    searchItemsSimple(itemName: string, pageNo?: number, categoryCode?: number): Promise<NormalizedAuctionSearchResult>;
    /**
     * 경매장 아이템 검색 (고급 검색)
     */
    searchItemsAdvanced(request: Partial<AuctionSearchRequestV9> & {
        PageNo: number;
    }): Promise<NormalizedAuctionSearchResult>;
    /**
     * 경매장 아이템 검색 (가격 범위)
     */
    searchItemsByPriceRange(itemName: string, minPrice: number, maxPrice: number, pageNo?: number): Promise<NormalizedAuctionSearchResult>;
    /**
     * 경매장 아이템 검색 (등급별)
     */
    searchItemsByGrade(itemName: string, grade: string, pageNo?: number): Promise<NormalizedAuctionSearchResult>;
    /**
     * 캐시 통계 조회
     */
    getCacheStats(): {
        optionsCacheSize: number;
        searchCacheSize: number;
    };
    /**
     * 캐시 정리
     */
    cleanupCache(): void;
    /**
     * 캐시 초기화
     */
    clearCache(): void;
}
