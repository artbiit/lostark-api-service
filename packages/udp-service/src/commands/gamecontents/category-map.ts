/**
 * GameContentsService.getCalendar() 응답의 CategoryName 매핑 상수.
 *
 * V9 API 의 실 응답에서 CategoryName 변형이 발견되면 본 파일만 수정.
 *
 * 2026-05-16 실측: 도비스 던전(ABYSS) / 도가토(GUARDIAN) 두 콘텐츠는 게임 내 종료.
 * 명령 제거됨 (ADR-0003)
 */

export const CALENDAR_CATEGORIES = {
  ADVENTURE_ISLAND: '모험 섬',
  ISLAND: '섬',
  CHAOS_GATE: '카오스게이트',
  GHOST_SHIP: '유령선',
  FIELD_BOSS: '필드보스',
  DAWN_ISLAND: '태초의 섬',
  ROWEN: '로웬',
} as const;

/** 프로키온 명령에서 노출할 카테고리 (legacy 와 동일). */
export const PROCYON_CATEGORIES: readonly string[] = [
  CALENDAR_CATEGORIES.ADVENTURE_ISLAND,
  CALENDAR_CATEGORIES.ISLAND,
  CALENDAR_CATEGORIES.CHAOS_GATE,
  CALENDAR_CATEGORIES.GHOST_SHIP,
  CALENDAR_CATEGORIES.FIELD_BOSS,
  CALENDAR_CATEGORIES.DAWN_ISLAND,
];

/** 모험 섬에 한해 RewardItems 의 Name 매칭에 사용할 키워드. */
export const ADVENTURE_REWARD_KEYWORDS = ['실링', '골드', '주화', '카드'] as const;
