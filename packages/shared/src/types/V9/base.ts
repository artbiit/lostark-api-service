/**
 * @lostark-api: V9.0.0
 * @reference: https://developer-lostark.game.onstove.com/getting-started
 *
 * 로스트아크 API V9.0.0 기본 타입 정의
 * - 공통으로 사용되는 기본 타입들
 * - API 응답의 공통 구조
 */

// === 공통 열거형 ===

/**
 * 아이템 등급
 */
export enum ItemGrade {
  일반 = '일반',
  고급 = '고급',
  희귀 = '희귀',
  영웅 = '영웅',
  전설 = '전설',
  고대 = '고대',
  에스더 = '에스더',
  유물 = '유물',
  고대유물 = '고대유물',
  에스더유물 = '에스더유물',
}

/**
 * 공지사항 타입
 */
export enum NoticeType {
  공지 = '공지',
  점검 = '점검',
  상점 = '상점',
  이벤트 = '이벤트',
}

/**
 * 정렬 조건
 */
export enum SortCondition {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * 경매장 정렬 타입
 */
export enum AuctionSort {
  BUY_PRICE = 'BUY_PRICE',
  BID_PRICE = 'BID_PRICE',
  END_DATE = 'END_DATE',
  ITEM_LEVEL = 'ITEM_LEVEL',
}

// === 공통 인터페이스 ===

/**
 * 기본 아이템 정보
 */
export interface BaseItem {
  Name: string;
  Icon: string;
  Grade: ItemGrade;
  Tier?: number;
  Level?: number;
  GradeQuality?: number | null;
}

/**
 * 아이템 옵션
 */
export interface ItemOption {
  Type: string;
  OptionName: string;
  OptionNameTripod?: string;
  Value: number;
  IsPenalty: boolean;
  ClassName?: string;
  IsValuePercentage?: boolean;
}

/**
 * 경매장 정보
 */
export interface AuctionInfo {
  StartPrice: number;
  BuyPrice: number;
  BidPrice: number;
  EndDate: string; // ISO 8601 형식
  BidCount: number;
  BidStartPrice: number;
  IsCompetitive: boolean;
  TradeAllowCount: number;
  UpgradeLevel?: number | null;
}

/**
 * 페이지네이션 정보
 */
export interface PaginationInfo {
  PageNo: number;
  PageSize: number;
  TotalCount: number;
}

/**
 * API 응답 기본 구조
 */
export interface ApiResponse<T> {
  data: T;
  status: number;
  comment?: string;
}

/**
 * Rate Limit 정보
 */
export interface RateLimitInfo {
  limit: string | null;
  remaining: string | null;
  reset: string | null;
}

// === 유틸리티 타입 ===

/**
 * 선택적 필드를 가진 타입
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * null을 허용하는 타입
 */
export type Nullable<T> = T | null;

/**
 * 빈 객체를 허용하는 타입
 */
export type EmptyObject = Record<string, never>;

/**
 * API 버전 정보
 */
export interface ApiVersion {
  __version: 'V9.0.0';
}

// === 공통 상수 ===

/**
 * API 기본 URL
 */
export const LOSTARK_API_BASE_URL = 'https://developer-lostark.game.onstove.com';

/**
 * Rate Limit (requests per minute)
 */
export const API_RATE_LIMIT_PER_MINUTE = 100;

/**
 * 서버 목록
 */
export const SERVERS = {
  lufeon: '루페온',
  cillian: '실리안',
  aman: '아만',
  carmine: '카마인',
  cajeros: '카제로스',
  abrelshud: '아브렐슈드',
  kadan: '카단',
  ninav: '니나브',
} as const;

export type ServerName = typeof SERVERS[keyof typeof SERVERS];

/**
 * 직업 목록 (일부)
 */
export const CLASSES = {
  // 전사
  워로드: '워로드',
  버서커: '버서커',
  디스트로이어: '디스트로이어',
  건랜서: '건랜서',
  
  // 무도가
  인파이터: '인파이터',
  배틀마스터: '배틀마스터',
  포격사: '포격사',
  스트라이커: '스트라이커',
  
  // 건너
  데빌헌터: '데빌헌터',
  블래스터: '블래스터',
  호크아이: '호크아이',
  스카우터: '스카우터',
  건슬링어: '건슬링어',
  아르티스트: '아르티스트',
  
  // 마법사
  바드: '바드',
  소서리스: '소서리스',
  아르카나: '아르카나',
  블레이드: '블레이드',
  데모닉: '데모닉',
  리퍼: '리퍼',
  
  // 스페셜리스트
  도화가: '도화가',
  기상술사: '기상술사',
  
  // 기타
  발키리: '발키리',
  서머너: '서머너',
} as const;

export type ClassName = typeof CLASSES[keyof typeof CLASSES];
