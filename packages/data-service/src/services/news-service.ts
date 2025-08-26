/**
 * @cursor-change: 2025-01-27, v1.0.0, NEWS API 서비스 구현
 *
 * Lost Ark API V9.0.0 NEWS API 서비스
 * - 공지사항 목록 조회
 * - 이벤트 목록 조회
 */

import type { NoticeSearchParams } from '@lostark/shared/types/V9/news.js';
import { NewsCache } from '../cache/news-cache.js';
import { NewsClient } from '../clients/news-client.js';
import type {
  NormalizedEventsResult,
  NormalizedNoticesResult,
} from '../normalizers/news-normalizer.js';
import { NewsNormalizer } from '../normalizers/news-normalizer.js';

/**
 * NEWS API 서비스 클래스
 */
export class NewsService {
  private client: NewsClient;
  private cache: NewsCache;

  constructor() {
    this.client = new NewsClient();
    this.cache = NewsCache.getInstance();
  }

  /**
   * 공지사항 목록 조회 (캐시 우선)
   */
  async getNotices(params?: NoticeSearchParams): Promise<NormalizedNoticesResult> {
    const searchParams = params ? new URLSearchParams(params as any).toString() : undefined;

    // 캐시에서 먼저 조회
    const cached = await this.cache.getNotices(searchParams);
    if (cached) {
      return cached;
    }

    // API 호출
    const data = await this.client.getNotices(params);
    const normalized = NewsNormalizer.normalizeNotices(data);

    // 캐시에 저장
    await this.cache.setNotices(data, normalized, searchParams);

    return normalized;
  }

  /**
   * 이벤트 목록 조회 (캐시 우선)
   */
  async getEvents(): Promise<NormalizedEventsResult> {
    // 캐시에서 먼저 조회
    const cached = await this.cache.getEvents();
    if (cached) {
      return cached;
    }

    // API 호출
    const data = await this.client.getEvents();
    const normalized = NewsNormalizer.normalizeEvents(data);

    // 캐시에 저장
    await this.cache.setEvents(data, normalized);

    return normalized;
  }

  /**
   * 공지사항 검색 (제목 기반)
   */
  async searchNotices(searchText: string): Promise<NormalizedNoticesResult> {
    return this.getNotices({ searchText });
  }

  /**
   * 공지사항 조회 (타입별)
   */
  async getNoticesByType(type: string): Promise<NormalizedNoticesResult> {
    return this.getNotices({ type: type as any });
  }

  /**
   * 최신 공지사항 조회 (최근 N개)
   */
  async getRecentNotices(limit: number = 10): Promise<NormalizedNoticesResult> {
    const result = await this.getNotices();
    return {
      ...result,
      notices: result.notices.slice(0, limit),
      totalCount: Math.min(result.totalCount, limit),
    };
  }

  /**
   * 진행 중인 이벤트 조회
   */
  async getActiveEvents(): Promise<NormalizedEventsResult> {
    const result = await this.getEvents();
    const activeEvents = result.events.filter((event) => event.isActive);

    return {
      ...result,
      events: activeEvents,
      totalCount: activeEvents.length,
      activeCount: activeEvents.length,
    };
  }

  /**
   * 최신 이벤트 조회 (최근 N개)
   */
  async getRecentEvents(limit: number = 10): Promise<NormalizedEventsResult> {
    const result = await this.getEvents();
    return {
      ...result,
      events: result.events.slice(0, limit),
      totalCount: Math.min(result.totalCount, limit),
    };
  }

  /**
   * 공지사항 및 이벤트 통합 조회
   */
  async getNewsSummary(): Promise<{
    notices: NormalizedNoticesResult;
    events: NormalizedEventsResult;
  }> {
    const [notices, events] = await Promise.all([this.getRecentNotices(5), this.getActiveEvents()]);

    return { notices, events };
  }

  /**
   * 캐시 통계 조회
   */
  getCacheStats(): { noticesCacheSize: number; eventsCacheSize: number } {
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
