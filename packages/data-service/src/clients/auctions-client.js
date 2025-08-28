/**
 * @cursor-change: 2025-01-27, v1.0.0, AUCTIONS API 클라이언트 구현
 *
 * Lost Ark API V9.0.0 AUCTIONS API 클라이언트
 * - 경매장 검색 옵션 조회
 * - 경매장 아이템 검색
 */
import { AUCTIONS_ENDPOINTS } from '@lostark/shared/types/V9/auctions.js';
import { ApiClient } from './api-client.js';
/**
 * AUCTIONS API 클라이언트
 */
export class AuctionsClient extends ApiClient {
    /**
     * 경매장 검색 옵션 조회
     */
    async getOptions() {
        return this.get(AUCTIONS_ENDPOINTS.OPTIONS);
    }
    /**
     * 경매장 아이템 검색
     */
    async searchItems(request) {
        return this.post(AUCTIONS_ENDPOINTS.ITEMS, request);
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
}
