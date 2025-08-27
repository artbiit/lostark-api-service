/**
 * @cursor-change: 2025-01-27, v1.0.0, NEWS API 정규화 모듈 구현
 *
 * Lost Ark API V9.0.0 NEWS API 데이터 정규화
 * - 공지사항 정규화
 * - 이벤트 정규화
 */
import type { EventsResponseV9, EventV9, NoticesResponseV9, NoticeV9 } from '@lostark/shared/types/V9/news.js';
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
export declare class NewsNormalizer {
    /**
     * 공지사항 정규화
     */
    static normalizeNotice(notice: NoticeV9): NormalizedNotice;
    /**
     * 이벤트 보상 아이템 정규화
     */
    private static normalizeEventRewardItem;
    /**
     * 이벤트 정규화
     */
    static normalizeEvent(event: EventV9): NormalizedEvent;
    /**
     * 공지사항 목록 정규화
     */
    static normalizeNotices(notices: NoticesResponseV9): NormalizedNoticesResult;
    /**
     * 이벤트 목록 정규화
     */
    static normalizeEvents(events: EventsResponseV9): NormalizedEventsResult;
    /**
     * 공지사항 배열 정규화
     */
    static normalizeNoticesArray(notices: NoticeV9[]): NormalizedNotice[];
    /**
     * 이벤트 배열 정규화
     */
    static normalizeEventsArray(events: EventV9[]): NormalizedEvent[];
}
