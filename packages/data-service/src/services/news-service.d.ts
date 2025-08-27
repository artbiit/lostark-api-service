/**
 * @cursor-change: 2025-01-27, v1.0.0, NEWS API 서비스 구현
 *
 * Lost Ark API V9.0.0 NEWS API 서비스
 * - 공지사항 목록 조회
 * - 이벤트 목록 조회
 */
import type { NoticeSearchParams } from '@lostark/shared/types/V9/news.js';
import type { NormalizedEventsResult, NormalizedNoticesResult } from '../normalizers/news-normalizer.js';
/**
 * NEWS API 서비스 클래스
 */
export declare class NewsService {
    private client;
    private cache;
    constructor();
    /**
     * 공지사항 목록 조회 (캐시 우선)
     */
    getNotices(params?: NoticeSearchParams): Promise<NormalizedNoticesResult>;
    /**
     * 이벤트 목록 조회 (캐시 우선)
     */
    getEvents(): Promise<NormalizedEventsResult>;
    /**
     * 공지사항 검색 (제목 기반)
     */
    searchNotices(searchText: string): Promise<NormalizedNoticesResult>;
    /**
     * 공지사항 조회 (타입별)
     */
    getNoticesByType(type: string): Promise<NormalizedNoticesResult>;
    /**
     * 최신 공지사항 조회 (최근 N개)
     */
    getRecentNotices(limit?: number): Promise<NormalizedNoticesResult>;
    /**
     * 진행 중인 이벤트 조회
     */
    getActiveEvents(): Promise<NormalizedEventsResult>;
    /**
     * 최신 이벤트 조회 (최근 N개)
     */
    getRecentEvents(limit?: number): Promise<NormalizedEventsResult>;
    /**
     * 공지사항 및 이벤트 통합 조회
     */
    getNewsSummary(): Promise<{
        notices: NormalizedNoticesResult;
        events: NormalizedEventsResult;
    }>;
    /**
     * 캐시 통계 조회
     */
    getCacheStats(): {
        noticesCacheSize: number;
        eventsCacheSize: number;
    };
    /**
     * 캐시 정리
     */
    cleanupCache(): void;
    /**
     * 캐시 초기화
     */
    clearCache(): void;
}
