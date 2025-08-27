/**
 * @cursor-change: 2025-01-27, v1.0.0, MARKETS API 클라이언트 구현
 *
 * Lost Ark API V9.0.0 MARKETS API 클라이언트
 * - 시장 검색 옵션 조회
 * - 아이템 ID로 시장 정보 조회
 * - 아이템 검색
 */
import type { MarketItemByIdResponseV9, MarketOptionsV9, MarketSearchRequestV9, MarketSearchResponseV9 } from '@lostark/shared/types/V9/markets.js';
import { ApiClient } from './api-client.js';
/**
 * MARKETS API 클라이언트
 */
export declare class MarketsClient extends ApiClient {
    /**
     * 시장 검색 옵션 조회
     */
    getOptions(): Promise<MarketOptionsV9>;
    /**
     * 시장 아이템 검색
     */
    searchItems(request: MarketSearchRequestV9): Promise<MarketSearchResponseV9>;
    /**
     * 아이템 ID로 시장 정보 조회
     */
    getItemById(itemId: number): Promise<MarketItemByIdResponseV9>;
    /**
     * 시장 아이템 검색 (간단한 검색)
     */
    searchItemsSimple(itemName: string, pageNo?: number, categoryCode?: number): Promise<MarketSearchResponseV9>;
    /**
     * 시장 아이템 검색 (고급 검색)
     */
    searchItemsAdvanced(request: Partial<MarketSearchRequestV9> & {
        PageNo: number;
    }): Promise<MarketSearchResponseV9>;
}
