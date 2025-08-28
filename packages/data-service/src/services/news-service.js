/**
 * @cursor-change: 2025-01-27, v1.0.0, NEWS API 서비스 구현
 *
 * Lost Ark API V9.0.0 NEWS API 서비스
 * - 공지사항 목록 조회
 * - 이벤트 목록 조회
 */
import { NewsCache } from '../cache/news-cache.js';
import { NewsClient } from '../clients/news-client.js';
import { NewsNormalizer } from '../normalizers/news-normalizer.js';
/**
 * NEWS API 서비스 클래스
 */
export class NewsService {
    client;
    cache;
    constructor() {
        this.client = new NewsClient();
        this.cache = NewsCache.getInstance();
    }
    /**
     * 공지사항 목록 조회 (캐시 우선)
     */
    async getNotices(params) {
        const searchParams = params ? new URLSearchParams(params).toString() : undefined;
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
    async getEvents() {
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
    async searchNotices(searchText) {
        return this.getNotices({ searchText });
    }
    /**
     * 공지사항 조회 (타입별)
     */
    async getNoticesByType(type) {
        return this.getNotices({ type: type });
    }
    /**
     * 최신 공지사항 조회 (최근 N개)
     */
    async getRecentNotices(limit = 10) {
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
    async getActiveEvents() {
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
    async getRecentEvents(limit = 10) {
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
    async getNewsSummary() {
        const [notices, events] = await Promise.all([this.getRecentNotices(5), this.getActiveEvents()]);
        return { notices, events };
    }
    /**
     * 캐시 통계 조회
     */
    getCacheStats() {
        return this.cache.getStats();
    }
    /**
     * 캐시 정리
     */
    cleanupCache() {
        this.cache.cleanup();
    }
    /**
     * 캐시 초기화
     */
    clearCache() {
        this.cache.clear();
    }
}
