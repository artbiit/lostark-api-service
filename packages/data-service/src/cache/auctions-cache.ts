/**
 * @cursor-change: 2025-01-27, v1.0.0, AUCTIONS API 캐시 모듈 구현
 *
 * Lost Ark API V9.0.0 AUCTIONS API 캐시 관리
 * - 경매장 검색 옵션 캐시
 * - 경매장 아이템 검색 결과 캐시
 */

import type {
  AuctionOptionsV9,
  AuctionSearchRequestV9,
  AuctionSearchResponseV9,
} from '@lostark/shared/types/V9/auctions';
import { createHash } from 'crypto';
import type {
  NormalizedAuctionOptions,
  NormalizedAuctionSearchResult,
} from '../normalizers/auctions-normalizer.js';

/**
 * AUCTIONS API 캐시 클래스
 */
export class AuctionsCache {
  private static instance: AuctionsCache;
  private optionsCache: Map<string, { data: NormalizedAuctionOptions; timestamp: number }> =
    new Map();
  private searchCache: Map<string, { data: NormalizedAuctionSearchResult; timestamp: number }> =
    new Map();

  // TTL 설정 (밀리초)
  private readonly OPTIONS_TTL = 24 * 60 * 60 * 1000; // 24시간 (검색 옵션은 자주 변경되지 않음)
  private readonly SEARCH_TTL = 5 * 60 * 1000; // 5분 (검색 결과는 빠르게 변경됨)

  private constructor() {}

  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(): AuctionsCache {
    if (!AuctionsCache.instance) {
      AuctionsCache.instance = new AuctionsCache();
    }
    return AuctionsCache.instance;
  }

  /**
   * 검색 요청을 캐시 키로 변환
   */
  private generateSearchKey(request: AuctionSearchRequestV9): string {
    const requestString = JSON.stringify(request);
    return createHash('md5').update(requestString).digest('hex');
  }

  /**
   * 경매장 검색 옵션 캐시 저장
   */
  async setOptions(
    data: AuctionOptionsV9,
    normalizedData: NormalizedAuctionOptions,
  ): Promise<void> {
    const key = 'auctions:options';
    this.optionsCache.set(key, {
      data: normalizedData,
      timestamp: Date.now(),
    });
  }

  /**
   * 경매장 검색 옵션 캐시 조회
   */
  async getOptions(): Promise<NormalizedAuctionOptions | null> {
    const key = 'auctions:options';
    const cached = this.optionsCache.get(key);

    if (!cached) {
      return null;
    }

    // TTL 체크
    if (Date.now() - cached.timestamp > this.OPTIONS_TTL) {
      this.optionsCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 경매장 검색 결과 캐시 저장
   */
  async setSearchResult(
    request: AuctionSearchRequestV9,
    data: AuctionSearchResponseV9,
    normalizedData: NormalizedAuctionSearchResult,
  ): Promise<void> {
    const key = `auctions:search:${this.generateSearchKey(request)}`;
    this.searchCache.set(key, {
      data: normalizedData,
      timestamp: Date.now(),
    });
  }

  /**
   * 경매장 검색 결과 캐시 조회
   */
  async getSearchResult(
    request: AuctionSearchRequestV9,
  ): Promise<NormalizedAuctionSearchResult | null> {
    const key = `auctions:search:${this.generateSearchKey(request)}`;
    const cached = this.searchCache.get(key);

    if (!cached) {
      return null;
    }

    // TTL 체크
    if (Date.now() - cached.timestamp > this.SEARCH_TTL) {
      this.searchCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 캐시 통계 조회
   */
  getStats(): { optionsCacheSize: number; searchCacheSize: number } {
    return {
      optionsCacheSize: this.optionsCache.size,
      searchCacheSize: this.searchCache.size,
    };
  }

  /**
   * 캐시 정리 (만료된 항목 제거)
   */
  cleanup(): void {
    const now = Date.now();

    // 검색 옵션 캐시 정리
    for (const [key, value] of this.optionsCache.entries()) {
      if (now - value.timestamp > this.OPTIONS_TTL) {
        this.optionsCache.delete(key);
      }
    }

    // 검색 결과 캐시 정리
    for (const [key, value] of this.searchCache.entries()) {
      if (now - value.timestamp > this.SEARCH_TTL) {
        this.searchCache.delete(key);
      }
    }
  }

  /**
   * 전체 캐시 초기화
   */
  clear(): void {
    this.optionsCache.clear();
    this.searchCache.clear();
  }
}
