/**
 * @cursor-change: 2026-05-20, v2.0.0, GAMECONTENTS API 서비스 - 3-tier 캐시 매니저 위임
 *
 * Lost Ark API V9.0.0 GAMECONTENTS API 서비스
 * - 주간 콘텐츠 달력 조회 (3-tier 캐시 + SWR fallback)
 * - filter-on-read 정책: contents-by-category / active / today / by-day 모두
 *   getCalendar() 캐시 결과를 재활용 (FR-1-4)
 *
 * design.md §"파일 영향 맵" 및 Phase D 참조.
 */

import type { GameContentsCalendarResponseV9 } from '@lostark/shared/types/V9/gamecontents';

import {
  GameContentsCacheManager,
  gameContentsCacheManager,
} from '../cache/gamecontents-cache-manager.js';
import { GameContentsClient } from '../clients/gamecontents-client.js';
import type { CacheLookupResult } from '../cache/domain-cache-manager.js';

/**
 * GAMECONTENTS API 서비스 클래스
 */
export class GameContentsService {
  private client: GameContentsClient;
  private cacheManager: GameContentsCacheManager;

  constructor(cacheManager: GameContentsCacheManager = gameContentsCacheManager) {
    this.client = new GameContentsClient();
    this.cacheManager = cacheManager;
  }

  /**
   * 주간 콘텐츠 달력 조회 — 캐시 매니저에 위임.
   *
   * 본 메서드는 cache 메타까지 포함된 `CacheLookupResult` 를 반환한다. server.ts 가 직접
   * envelope 에 매핑한다.
   */
  async getCalendarWithCache(): Promise<CacheLookupResult<GameContentsCalendarResponseV9>> {
    return this.cacheManager.getCalendar(() => this.client.getCalendar());
  }

  /**
   * 기존 호출자(테스트, 내부 헬퍼)와의 하위호환을 위한 raw 데이터 반환 변형.
   * 새로 작성하는 코드는 `getCalendarWithCache` 를 권장.
   */
  async getCalendar(): Promise<GameContentsCalendarResponseV9> {
    const result = await this.getCalendarWithCache();
    return result.data;
  }

  /**
   * 특정 카테고리 콘텐츠 — getCalendar 캐시 재활용 (filter-on-read).
   */
  async getContentsByCategory(categoryName: string): Promise<GameContentsCalendarResponseV9> {
    const all = await this.getCalendar();
    return all.filter((content) => content.CategoryName === categoryName);
  }

  /**
   * 진행 중인 콘텐츠 — getCalendar 캐시 재활용.
   * 콘텐츠 시작 후 2시간 동안 활성으로 간주 (기존 클라이언트 정책 보존).
   */
  async getActiveContents(): Promise<GameContentsCalendarResponseV9> {
    const all = await this.getCalendar();
    const now = new Date();
    return all.filter((content) =>
      content.StartTimes.some((startTime) => {
        const start = new Date(startTime);
        const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
        return start <= now && now <= end;
      }),
    );
  }

  /**
   * 오늘의 콘텐츠 — getCalendar 캐시 재활용.
   */
  async getTodayContents(): Promise<GameContentsCalendarResponseV9> {
    const all = await this.getCalendar();
    const dayOfWeek = new Date().getDay();
    return all.filter((content) =>
      content.StartTimes.some((startTime) => new Date(startTime).getDay() === dayOfWeek),
    );
  }

  /**
   * 특정 요일 콘텐츠 — getCalendar 캐시 재활용.
   */
  async getContentsByDay(dayOfWeek: number): Promise<GameContentsCalendarResponseV9> {
    const all = await this.getCalendar();
    return all.filter((content) =>
      content.StartTimes.some((startTime) => new Date(startTime).getDay() === dayOfWeek),
    );
  }

  /**
   * 캐시 무효화 — 수요일 06:00 KST 주간 리셋 등에서 호출 가능 (FR-1-5).
   * 본 phase 는 cron 미도입 (DP-8) — 라우트/스케줄러는 후속.
   */
  async invalidateCache(): Promise<void> {
    await this.cacheManager.invalidateCalendar();
  }
}
