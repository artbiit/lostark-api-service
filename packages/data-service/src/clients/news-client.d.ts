/**
 * @cursor-change: 2025-01-27, v1.0.0, NEWS API 클라이언트 구현
 *
 * Lost Ark API V9.0.0 NEWS API 클라이언트
 * - 공지사항 목록 조회
 * - 이벤트 목록 조회
 */
import type { EventsResponseV9, NoticeSearchParams, NoticesResponseV9 } from '@lostark/shared/types/V9/news.js';
import { ApiClient } from './api-client.js';
/**
 * NEWS API 클라이언트
 */
export declare class NewsClient extends ApiClient {
    /**
     * 공지사항 목록 조회
     */
    getNotices(params?: NoticeSearchParams): Promise<NoticesResponseV9>;
    /**
     * 이벤트 목록 조회
     */
    getEvents(): Promise<EventsResponseV9>;
    /**
     * 공지사항 검색 (제목 기반)
     */
    searchNotices(searchText: string): Promise<NoticesResponseV9>;
    /**
     * 공지사항 조회 (타입별)
     */
    getNoticesByType(type: string): Promise<NoticesResponseV9>;
    /**
     * 최신 공지사항 조회 (최근 N개)
     */
    getRecentNotices(limit?: number): Promise<NoticesResponseV9>;
    /**
     * 진행 중인 이벤트 조회
     */
    getActiveEvents(): Promise<EventsResponseV9>;
}
