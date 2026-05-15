/**
 * @cursor-change: 2025-01-27, v1.0.0, NEWS API 캐시 모듈 구현
 *
 * Lost Ark API V9.0.0 NEWS API 캐시 관리
 * - 공지사항 캐시
 * - 이벤트 캐시
 */

import type { EventsResponseV9, NoticesResponseV9 } from '@lostark/shared/types/V9/news';
import type {
  NormalizedEventsResult,
  NormalizedNoticesResult,
} from '../normalizers/news-normalizer.js';

/**
 * NEWS API 캐시 클래스
 */
export class NewsCache {
  private static instance: NewsCache;
  private noticesCache: Map<string, { data: NormalizedNoticesResult; timestamp: number }> =
    new Map();
  private eventsCache: Map<string, { data: NormalizedEventsResult; timestamp: number }> = new Map();

  // TTL 설정 (밀리초)
  private readonly NOTICES_TTL = 30 * 60 * 1000; // 30분 (공지사항은 자주 변경되지 않음)
  private readonly EVENTS_TTL = 60 * 60 * 1000; // 1시간 (이벤트는 더 자주 변경되지 않음)

  private constructor() {}

  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(): NewsCache {
    if (!NewsCache.instance) {
      NewsCache.instance = new NewsCache();
    }
    return NewsCache.instance;
  }

  /**
   * 공지사항 캐시 저장
   */
  async setNotices(
    data: NoticesResponseV9,
    normalizedData: NormalizedNoticesResult,
    searchParams?: string,
  ): Promise<void> {
    const key = searchParams ? `news:notices:${searchParams}` : 'news:notices';
    this.noticesCache.set(key, {
      data: normalizedData,
      timestamp: Date.now(),
    });
  }

  /**
   * 공지사항 캐시 조회
   */
  async getNotices(searchParams?: string): Promise<NormalizedNoticesResult | null> {
    const key = searchParams ? `news:notices:${searchParams}` : 'news:notices';
    const cached = this.noticesCache.get(key);

    if (!cached) {
      return null;
    }

    // TTL 체크
    if (Date.now() - cached.timestamp > this.NOTICES_TTL) {
      this.noticesCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 이벤트 캐시 저장
   */
  async setEvents(data: EventsResponseV9, normalizedData: NormalizedEventsResult): Promise<void> {
    const key = 'news:events';
    this.eventsCache.set(key, {
      data: normalizedData,
      timestamp: Date.now(),
    });
  }

  /**
   * 이벤트 캐시 조회
   */
  async getEvents(): Promise<NormalizedEventsResult | null> {
    const key = 'news:events';
    const cached = this.eventsCache.get(key);

    if (!cached) {
      return null;
    }

    // TTL 체크
    if (Date.now() - cached.timestamp > this.EVENTS_TTL) {
      this.eventsCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 캐시 통계 조회
   */
  getStats(): { noticesCacheSize: number; eventsCacheSize: number } {
    return {
      noticesCacheSize: this.noticesCache.size,
      eventsCacheSize: this.eventsCache.size,
    };
  }

  /**
   * 캐시 정리 (만료된 항목 제거)
   */
  cleanup(): void {
    const now = Date.now();

    // 공지사항 캐시 정리
    for (const [key, value] of this.noticesCache.entries()) {
      if (now - value.timestamp > this.NOTICES_TTL) {
        this.noticesCache.delete(key);
      }
    }

    // 이벤트 캐시 정리
    for (const [key, value] of this.eventsCache.entries()) {
      if (now - value.timestamp > this.EVENTS_TTL) {
        this.eventsCache.delete(key);
      }
    }
  }

  /**
   * 전체 캐시 초기화
   */
  clear(): void {
    this.noticesCache.clear();
    this.eventsCache.clear();
  }
}
