/**
 * @cursor-change: 2025-01-27, v1.0.0, AUCTIONS API 서비스 구현
 *
 * Lost Ark API V9.0.0 AUCTIONS API 서비스
 * - 경매장 검색 옵션 조회
 * - 경매장 아이템 검색
 */
import { AuctionsCache } from '../cache/auctions-cache.js';
import { AuctionsClient } from '../clients/auctions-client.js';
import { AuctionsNormalizer } from '../normalizers/auctions-normalizer.js';
/**
 * AUCTIONS API 서비스 클래스
 */
export class AuctionsService {
    client;
    cache;
    constructor() {
        this.client = new AuctionsClient();
        this.cache = AuctionsCache.getInstance();
    }
    /**
     * 경매장 검색 옵션 조회 (캐시 우선)
     */
    async getOptions() {
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
    async searchItems(request) {
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
    async searchItemsSimple(itemName, pageNo = 1, categoryCode) {
        const request = {
            CategoryCode: categoryCode || 0,
            Sort: 'BUY_PRICE',
            SortCondition: 'ASC',
            ItemName: itemName,
            PageNo: pageNo,
        };
        return this.searchItems(request);
    }
    /**
     * 경매장 아이템 검색 (고급 검색)
     */
    async searchItemsAdvanced(request) {
        const defaultRequest = {
            CategoryCode: 0,
            Sort: 'BUY_PRICE',
            SortCondition: 'ASC',
            PageNo: 1,
        };
        const finalRequest = { ...defaultRequest, ...request };
        return this.searchItems(finalRequest);
    }
    /**
     * 경매장 아이템 검색 (가격 범위)
     */
    async searchItemsByPriceRange(itemName, minPrice, maxPrice, pageNo = 1) {
        const request = {
            CategoryCode: 0,
            Sort: 'BUY_PRICE',
            SortCondition: 'ASC',
            ItemName: itemName,
            PageNo: pageNo,
            // 가격 필터링은 클라이언트에서 처리
        };
        const result = await this.searchItems(request);
        // 가격 범위 필터링
        const filteredItems = result.items.filter((item) => item.auctionInfo.buyPrice >= minPrice && item.auctionInfo.buyPrice <= maxPrice);
        return {
            ...result,
            items: filteredItems,
            totalCount: filteredItems.length,
        };
    }
    /**
     * 경매장 아이템 검색 (등급별)
     */
    async searchItemsByGrade(itemName, grade, pageNo = 1) {
        const request = {
            CategoryCode: 0,
            Sort: 'BUY_PRICE',
            SortCondition: 'ASC',
            ItemName: itemName,
            ItemGrade: grade,
            PageNo: pageNo,
        };
        return this.searchItems(request);
    }
    /**
     * 캐시 통계 조회
     */
    getCacheStats() {
        return this.cache.getStats();
    }
    /**
     * 캐시 정리
     */
    cleanupCache() {
        this.cache.cleanup();
    }
    /**
     * 캐시 초기화
     */
    clearCache() {
        this.cache.clear();
    }
}
