/**
 * @cursor-change: 2025-01-27, v1.0.0, MARKETS API 클라이언트 구현
 *
 * Lost Ark API V9.0.0 MARKETS API 클라이언트
 * - 시장 검색 옵션 조회
 * - 아이템 ID로 시장 정보 조회
 * - 아이템 검색
 */
import { MARKETS_ENDPOINTS } from '@lostark/shared/types/V9/markets.js';
import { ApiClient } from './api-client.js';
/**
 * MARKETS API 클라이언트
 */
export class MarketsClient extends ApiClient {
    /**
     * 시장 검색 옵션 조회
     */
    async getOptions() {
        return this.get(MARKETS_ENDPOINTS.OPTIONS);
    }
    /**
     * 시장 아이템 검색
     */
    async searchItems(request) {
        return this.post(MARKETS_ENDPOINTS.ITEMS, request);
    }
    /**
     * 아이템 ID로 시장 정보 조회
     */
    async getItemById(itemId) {
        const url = MARKETS_ENDPOINTS.ITEM_BY_ID.replace('{itemId}', itemId.toString());
        return this.get(url);
    }
    /**
     * 시장 아이템 검색 (간단한 검색)
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
     * 시장 아이템 검색 (고급 검색)
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
