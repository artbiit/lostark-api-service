/**
 * @cursor-change: 2026-05-20, v2.0.0, NEWS API 서비스 - 3-tier 캐시 매니저 위임
 *
 * Lost Ark API V9.0.0 NEWS API 서비스
 * - 공지사항 / 이벤트 목록을 3-tier 캐시 + SWR fallback 으로 제공
 * - searchParams 별 키 분리 (FR-2-4)
 *
 * design.md §"파일 영향 맵" / Phase E 참조. 기존 NewsCache (싱글톤 in-memory only)
 * 는 본 commit 에서 NewsCacheManager 로 완전 대체됨 (D-1).
 */

import type { NoticeSearchParams } from '@lostark/shared/types/V9/news';

import { NewsCacheManager, newsCacheManager } from '../cache/news-cache-manager.js';
import { NewsClient } from '../clients/news-client.js';
import type { CacheLookupResult } from '../cache/domain-cache-manager.js';
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
  private cacheManager: NewsCacheManager;

  constructor(cacheManager: NewsCacheManager = newsCacheManager) {
    this.client = new NewsClient();
    this.cacheManager = cacheManager;
  }

  /**
   * 공지사항 목록 조회 — 캐시 매니저에 위임. cache 메타까지 반환.
   */
  async getNoticesWithCache(
    params?: NoticeSearchParams,
  ): Promise<CacheLookupResult<NormalizedNoticesResult>> {
    return this.cacheManager.getNotices(async () => {
      const data = await this.client.getNotices(params);
      return NewsNormalizer.normalizeNotices(data);
    }, params);
  }

  /**
   * 이벤트 목록 조회 — 캐시 매니저에 위임. cache 메타까지 반환.
   */
  async getEventsWithCache(): Promise<CacheLookupResult<NormalizedEventsResult>> {
    return this.cacheManager.getEvents(async () => {
      const data = await this.client.getEvents();
      return NewsNormalizer.normalizeEvents(data);
    });
  }

  /**
   * 하위호환: data 만 반환. 새 코드는 *WithCache 변형 권장.
   */
  async getNotices(params?: NoticeSearchParams): Promise<NormalizedNoticesResult> {
    const result = await this.getNoticesWithCache(params);
    return result.data;
  }

  /**
   * 하위호환: data 만 반환. 새 코드는 *WithCache 변형 권장.
   */
  async getEvents(): Promise<NormalizedEventsResult> {
    const result = await this.getEventsWithCache();
    return result.data;
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
    return this.getNotices({ type: type as never });
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
   * 캐시 무효화 — 운영 핸들러용. (FR-8 라우트는 본 phase 미포함, DP-3)
   */
  async invalidateCache(params?: NoticeSearchParams): Promise<void> {
    await Promise.all([
      this.cacheManager.invalidateNotices(params),
      this.cacheManager.invalidateEvents(),
    ]);
  }
}
