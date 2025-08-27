/**
 * @cursor-change: 2025-01-27, v1.0.0, GAMECONTENTS API 클라이언트 구현
 *
 * Lost Ark API V9.0.0 GAMECONTENTS API 클라이언트
 * - 주간 콘텐츠 달력 조회
 */
import type { GameContentsCalendarResponseV9 } from '@lostark/shared/types/V9/gamecontents.js';
import { ApiClient } from './api-client.js';
/**
 * GAMECONTENTS API 클라이언트
 */
export declare class GameContentsClient extends ApiClient {
    /**
     * 주간 콘텐츠 달력 조회
     */
    getCalendar(): Promise<GameContentsCalendarResponseV9>;
    /**
     * 특정 카테고리 콘텐츠 조회
     */
    getContentsByCategory(categoryName: string): Promise<GameContentsCalendarResponseV9>;
    /**
     * 진행 중인 콘텐츠 조회
     */
    getActiveContents(): Promise<GameContentsCalendarResponseV9>;
}
