/**
 * @cursor-change: 2025-01-27, v1.0.0, GAMECONTENTS API 서비스 구현
 *
 * Lost Ark API V9.0.0 GAMECONTENTS API 서비스
 * - 주간 콘텐츠 달력 조회
 */

import type { GameContentsCalendarResponseV9 } from '@lostark/shared/types/V9/gamecontents.js';
import { GameContentsClient } from '../clients/gamecontents-client.js';

/**
 * GAMECONTENTS API 서비스 클래스
 */
export class GameContentsService {
  private client: GameContentsClient;

  constructor() {
    this.client = new GameContentsClient();
  }

  /**
   * 주간 콘텐츠 달력 조회
   */
  async getCalendar(): Promise<GameContentsCalendarResponseV9> {
    return this.client.getCalendar();
  }

  /**
   * 특정 카테고리 콘텐츠 조회
   */
  async getContentsByCategory(categoryName: string): Promise<GameContentsCalendarResponseV9> {
    return this.client.getContentsByCategory(categoryName);
  }

  /**
   * 진행 중인 콘텐츠 조회
   */
  async getActiveContents(): Promise<GameContentsCalendarResponseV9> {
    return this.client.getActiveContents();
  }

  /**
   * 오늘의 콘텐츠 조회
   */
  async getTodayContents(): Promise<GameContentsCalendarResponseV9> {
    const allContents = await this.getCalendar();
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0: 일요일, 1: 월요일, ...

    return allContents.filter((content) => {
      return content.StartTimes.some((startTime) => {
        const start = new Date(startTime);
        return start.getDay() === dayOfWeek;
      });
    });
  }

  /**
   * 특정 요일 콘텐츠 조회
   */
  async getContentsByDay(dayOfWeek: number): Promise<GameContentsCalendarResponseV9> {
    const allContents = await this.getCalendar();

    return allContents.filter((content) => {
      return content.StartTimes.some((startTime) => {
        const start = new Date(startTime);
        return start.getDay() === dayOfWeek;
      });
    });
  }
}
