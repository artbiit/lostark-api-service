/**
 * @cursor-change: 2025-01-27, v1.0.0, NEWS API 정규화 모듈 구현
 *
 * Lost Ark API V9.0.0 NEWS API 데이터 정규화
 * - 공지사항 정규화
 * - 이벤트 정규화
 */

import type {
  EventRewardItemV9,
  EventsResponseV9,
  EventV9,
  NoticesResponseV9,
  NoticeV9,
} from '@lostark/shared/types/V9/news.js';

/**
 * 정규화된 공지사항
 */
export interface NormalizedNotice {
  title: string;
  date: string;
  link: string;
  type: string;
  normalizedAt: string;
}

/**
 * 정규화된 이벤트 보상 아이템
 */
export interface NormalizedEventRewardItem {
  name: string;
  icon: string;
  grade: string;
  startTimes: string[] | null;
}

/**
 * 정규화된 이벤트
 */
export interface NormalizedEvent {
  title: string;
  thumbnail: string;
  link: string;
  startDate: string;
  endDate: string;
  rewardDate: string | null;
  rewardItems: NormalizedEventRewardItem[];
  isActive: boolean;
  normalizedAt: string;
}

/**
 * 정규화된 공지사항 목록
 */
export interface NormalizedNoticesResult {
  notices: NormalizedNotice[];
  totalCount: number;
  normalizedAt: string;
}

/**
 * 정규화된 이벤트 목록
 */
export interface NormalizedEventsResult {
  events: NormalizedEvent[];
  totalCount: number;
  activeCount: number;
  normalizedAt: string;
}

/**
 * NEWS API 정규화 클래스
 */
export class NewsNormalizer {
  /**
   * 공지사항 정규화
   */
  static normalizeNotice(notice: NoticeV9): NormalizedNotice {
    return {
      title: notice.Title,
      date: notice.Date,
      link: notice.Link,
      type: notice.Type,
      normalizedAt: new Date().toISOString(),
    };
  }

  /**
   * 이벤트 보상 아이템 정규화
   */
  private static normalizeEventRewardItem(item: EventRewardItemV9): NormalizedEventRewardItem {
    return {
      name: item.Name,
      icon: item.Icon,
      grade: item.Grade,
      startTimes: item.StartTimes || null,
    };
  }

  /**
   * 이벤트 정규화
   */
  static normalizeEvent(event: EventV9): NormalizedEvent {
    const now = new Date();
    const startDate = new Date(event.StartDate);
    const endDate = new Date(event.EndDate);
    const isActive = startDate <= now && now <= endDate;

    return {
      title: event.Title,
      thumbnail: event.Thumbnail,
      link: event.Link,
      startDate: event.StartDate,
      endDate: event.EndDate,
      rewardDate: event.RewardDate || null,
      rewardItems: (event.RewardItems?.map(this.normalizeEventRewardItem) ||
        []) as NormalizedEventRewardItem[],
      isActive,
      normalizedAt: new Date().toISOString(),
    };
  }

  /**
   * 공지사항 목록 정규화
   */
  static normalizeNotices(notices: NoticesResponseV9): NormalizedNoticesResult {
    return {
      notices: notices.map(this.normalizeNotice),
      totalCount: notices.length,
      normalizedAt: new Date().toISOString(),
    };
  }

  /**
   * 이벤트 목록 정규화
   */
  static normalizeEvents(events: EventsResponseV9): NormalizedEventsResult {
    const normalizedEvents = events.map(this.normalizeEvent);
    const activeCount = normalizedEvents.filter((event) => event.isActive).length;

    return {
      events: normalizedEvents,
      totalCount: events.length,
      activeCount,
      normalizedAt: new Date().toISOString(),
    };
  }

  /**
   * 공지사항 배열 정규화
   */
  static normalizeNoticesArray(notices: NoticeV9[]): NormalizedNotice[] {
    return notices.map(this.normalizeNotice);
  }

  /**
   * 이벤트 배열 정규화
   */
  static normalizeEventsArray(events: EventV9[]): NormalizedEvent[] {
    return events.map(this.normalizeEvent);
  }
}
