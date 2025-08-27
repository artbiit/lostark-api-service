/**
 * @cursor-change: 2025-01-27, v1.0.0, AUCTIONS API 클라이언트 구현
 *
 * Lost Ark API V9.0.0 AUCTIONS API 클라이언트
 * - 경매장 검색 옵션 조회
 * - 경매장 아이템 검색
 */
import type { AuctionOptionsV9, AuctionSearchRequestV9, AuctionSearchResponseV9 } from '@lostark/shared/types/V9/auctions.js';
import { ApiClient } from './api-client.js';
/**
 * AUCTIONS API 클라이언트
 */
export declare class AuctionsClient extends ApiClient {
    /**
     * 경매장 검색 옵션 조회
     */
    getOptions(): Promise<AuctionOptionsV9>;
    /**
     * 경매장 아이템 검색
     */
    searchItems(request: AuctionSearchRequestV9): Promise<AuctionSearchResponseV9>;
    /**
     * 경매장 아이템 검색 (간단한 검색)
     */
    searchItemsSimple(itemName: string, pageNo?: number, categoryCode?: number): Promise<AuctionSearchResponseV9>;
    /**
     * 경매장 아이템 검색 (고급 검색)
     */
    searchItemsAdvanced(request: Partial<AuctionSearchRequestV9> & {
        PageNo: number;
    }): Promise<AuctionSearchResponseV9>;
}
