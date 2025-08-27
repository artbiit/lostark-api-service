/**
 * @cursor-change: 2025-01-27, v1.0.0, GAMECONTENTS API 클라이언트 구현
 *
 * Lost Ark API V9.0.0 GAMECONTENTS API 클라이언트
 * - 주간 콘텐츠 달력 조회
 */
import { GAMECONTENTS_ENDPOINTS } from '@lostark/shared/types/V9/gamecontents.js';
import { ApiClient } from './api-client.js';
/**
 * GAMECONTENTS API 클라이언트
 */
export class GameContentsClient extends ApiClient {
    /**
     * 주간 콘텐츠 달력 조회
     */
    async getCalendar() {
        return this.get(GAMECONTENTS_ENDPOINTS.CALENDAR);
    }
    /**
     * 특정 카테고리 콘텐츠 조회
     */
    async getContentsByCategory(categoryName) {
        const allContents = await this.getCalendar();
        return allContents.filter((content) => content.CategoryName === categoryName);
    }
    /**
     * 진행 중인 콘텐츠 조회
     */
    async getActiveContents() {
        const allContents = await this.getCalendar();
        const now = new Date();
        return allContents.filter((content) => {
            return content.StartTimes.some((startTime) => {
                const start = new Date(startTime);
                // 콘텐츠 시작 후 2시간 동안 활성으로 간주
                const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
                return start <= now && now <= end;
            });
        });
    }
}
