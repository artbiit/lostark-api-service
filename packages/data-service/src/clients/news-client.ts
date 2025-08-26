/**
 * @cursor-change: 2025-01-27, v1.0.0, NEWS API 클라이언트 구현
 *
 * Lost Ark API V9.0.0 NEWS API 클라이언트
 * - 공지사항 목록 조회
 * - 이벤트 목록 조회
 */

import type {
  EventsResponseV9,
  NoticeSearchParams,
  NoticesResponseV9,
} from '@lostark/shared/types/V9/news.js';
import { NEWS_ENDPOINTS } from '@lostark/shared/types/V9/news.js';
import { ApiClient } from './api-client.js';

/**
 * NEWS API 클라이언트
 */
export class NewsClient extends ApiClient {
  /**
   * 공지사항 목록 조회
   */
  async getNotices(params?: NoticeSearchParams): Promise<NoticesResponseV9> {
    const queryParams = new URLSearchParams();

    if (params?.searchText) {
      queryParams.append('searchText', params.searchText);
    }

    if (params?.type) {
      queryParams.append('type', params.type);
    }

    const url = queryParams.toString()
      ? `${NEWS_ENDPOINTS.NOTICES}?${queryParams.toString()}`
      : NEWS_ENDPOINTS.NOTICES;

    return this.get<NoticesResponseV9>(url);
  }

  /**
   * 이벤트 목록 조회
   */
  async getEvents(): Promise<EventsResponseV9> {
    return this.get<EventsResponseV9>(NEWS_ENDPOINTS.EVENTS);
  }

  /**
   * 공지사항 검색 (제목 기반)
   */
  async searchNotices(searchText: string): Promise<NoticesResponseV9> {
    return this.getNotices({ searchText });
  }

  /**
   * 공지사항 조회 (타입별)
   */
  async getNoticesByType(type: string): Promise<NoticesResponseV9> {
    return this.getNotices({ type: type as any });
  }

  /**
   * 최신 공지사항 조회 (최근 N개)
   */
  async getRecentNotices(limit: number = 10): Promise<NoticesResponseV9> {
    const notices = await this.getNotices();
    return notices.slice(0, limit);
  }

  /**
   * 진행 중인 이벤트 조회
   */
  async getActiveEvents(): Promise<EventsResponseV9> {
    const events = await this.getEvents();
    const now = new Date();

    return events.filter((event) => {
      const startDate = new Date(event.StartDate);
      const endDate = new Date(event.EndDate);
      return startDate <= now && now <= endDate;
    });
  }
}
