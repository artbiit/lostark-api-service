/**
 * @lostark-api: V9.0.0
 * @reference: https://developer-lostark.game.onstove.com/getting-started#API-NEWS
 *
 * 로스트아크 API V9.0.0 NEWS API 타입 정의
 * - 공지사항 목록
 * - 이벤트 목록
 */

import { ApiVersion, NoticeType } from './base.js';

// === 공지사항 API ===

/**
 * 공지사항 정보
 */
export interface NoticeV9 extends ApiVersion {
  Title: string;
  Date: string; // ISO 8601 형식 (예: "2025-08-20T09:59:54.163")
  Link: string;
  Type: NoticeType;
}

/**
 * 공지사항 목록 응답
 */
export type NoticesResponseV9 = NoticeV9[];

/**
 * 공지사항 검색 파라미터
 */
export interface NoticeSearchParams {
  searchText?: string;
  type?: NoticeType;
}

// === 이벤트 API ===

/**
 * 이벤트 정보
 */
export interface EventV9 extends ApiVersion {
  Title: string;
  Thumbnail: string;
  Link: string;
  StartDate: string; // ISO 8601 형식
  EndDate: string; // ISO 8601 형식
  RewardDate?: string; // ISO 8601 형식 (선택사항)
  RewardItems?: EventRewardItemV9[];
}

/**
 * 이벤트 보상 아이템
 */
export interface EventRewardItemV9 {
  Name: string;
  Icon: string;
  Grade: string;
  StartTimes?: string[] | null; // ISO 8601 형식 배열
}

/**
 * 이벤트 목록 응답
 */
export type EventsResponseV9 = EventV9[];

// === API 엔드포인트 타입 ===

/**
 * NEWS API 엔드포인트
 */
export const NEWS_ENDPOINTS = {
  NOTICES: '/news/notices',
  EVENTS: '/news/events',
} as const;

export type NewsEndpoint = typeof NEWS_ENDPOINTS[keyof typeof NEWS_ENDPOINTS];

// === 현재 버전 별칭 ===

/**
 * 현재 버전 타입 별칭
 */
export type Notice = NoticeV9;
export type Event = EventV9;
export type NoticesResponse = NoticesResponseV9;
export type EventsResponse = EventsResponseV9;
