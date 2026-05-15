/**
 * 카카오톡 텍스트 포맷 공용 유틸.
 *
 * legacy/libs/utils.js 의 elapsedTime/remainingTime/dayToString 컨벤션을
 * TS 로 이식하고, padStart 헬퍼·이모지 상수·섹션 헤더 빌더를 추가한다.
 */

// === padStart 헬퍼 ===

/** 품질 3자리 (예: 099, 100). */
export const padQuality = (q: number): string => String(Math.max(0, Math.floor(q))).padStart(3, '0');

/** 아이템 레벨 4자리 (예: 1620, 1640). */
export const padItemLevel = (lv: number): string =>
  String(Math.max(0, Math.floor(lv))).padStart(4, '0');

/** 두 자리 (예: 01, 12). 초월/상재 카운트. */
export const padTwoDigit = (n: number): string => String(Math.max(0, Math.floor(n))).padStart(2, '0');

// === 섹션 헤더 ===

/** <text> 형태의 섹션 헤더. legacy 의 `<${name}의 장비>` 패턴. */
export const sectionHeader = (text: string): string => `<${text}>`;

// === 이모지 상수 ===

export const EMOJI = {
  /** 초월 */
  TRANSCENDENCE: '⚜️',
  /** 상급 재련 */
  ADVANCED_REFORGE: '🔱',
} as const;

// === 시간 도메인 헬퍼 ===

const TIME_UNITS: Array<{ name: string; seconds: number }> = [
  { name: '년', seconds: 60 * 60 * 24 * 365 },
  { name: '개월', seconds: 60 * 60 * 24 * 30 },
  { name: '일', seconds: 60 * 60 * 24 },
  { name: '시간', seconds: 60 * 60 },
  { name: '분', seconds: 60 },
];

/**
 * `updatedAt` 으로부터 현재까지의 경과 시간을 한국어로 표현.
 * 예) "5분 전", "3시간 전", "방금 전".
 */
export function elapsedTime(updatedAt: Date | string | number, now: Date = new Date()): string {
  const past = new Date(updatedAt);
  const diffSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  if (diffSeconds <= 0) return '방금 전';
  for (const unit of TIME_UNITS) {
    const value = Math.floor(diffSeconds / unit.seconds);
    if (value > 0) return `${value}${unit.name} 전`;
  }
  return '방금 전';
}

/**
 * `target` 까지 남은 시간을 한국어로 표현.
 * 예) "2시간 후", "3일 후", "10초 후".
 */
export function remainingTime(
  target: Date | string | number,
  now: Date = new Date(),
): string {
  const end = new Date(target);
  const diffSeconds = Math.floor((end.getTime() - now.getTime()) / 1000);
  if (diffSeconds <= 0) return '방금 전';
  for (const unit of TIME_UNITS) {
    const value = Math.floor(diffSeconds / unit.seconds);
    if (value > 0) return `${value}${unit.name} 후`;
  }
  return `${diffSeconds}초 후`;
}

const DAY_OF_WEEK_KR = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

/** 한국어 요일명 ("월요일" 등). KST 기준 계산은 호출 측 책임. */
export function dayOfWeekKR(date: Date): string {
  const idx = date.getDay();
  return DAY_OF_WEEK_KR[idx] ?? '';
}

/**
 * 현재 시각을 KST (Asia/Seoul) 의 Date 로 반환.
 *
 * 주의: Date 자체는 UTC epoch 만 갖지만, getHours/getDay 등의 로컬 메서드는
 * 호스트 OS 의 timezone 을 따른다. 카카오톡 봇 서버가 KST 가 아닐 가능성을
 * 방어하기 위해 toLocaleString 으로 KST 시각을 재구성한 Date 를 만들어
 * `getHours()` 같은 호출이 KST 기준이 되도록 한다.
 */
export function nowKST(now: Date = new Date()): Date {
  // toLocaleString('en-US', { timeZone: 'Asia/Seoul' }) 은 호스트 timezone 과
  // 무관하게 KST 의 wall-clock 을 돌려준다. 이를 다시 Date 로 파싱하면
  // 그 Date 의 getHours/getDay 가 호스트 timezone 으로 계산되지만 wall-clock
  // 자체가 KST 라 결과적으로 KST 시각을 얻을 수 있다.
  const kstString = now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' });
  return new Date(kstString);
}

/**
 * KST 기준 다음 자정까지 남은 초.
 * 최소 1초, 최대 24시간 (race 방지 클램프).
 */
export function ttlUntilKSTMidnightSeconds(now: Date = new Date()): number {
  const kst = nowKST(now);
  const nextMidnight = new Date(kst);
  nextMidnight.setHours(24, 0, 0, 0);
  const diffMs = nextMidnight.getTime() - kst.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const clamped = Math.max(1, Math.min(seconds, 60 * 60 * 24));
  return clamped;
}

/** YYYYMMDD (KST). 랜전카 키에 사용. */
export function kstDateKey(now: Date = new Date()): string {
  const kst = nowKST(now);
  const y = kst.getFullYear();
  const m = padTwoDigit(kst.getMonth() + 1);
  const d = padTwoDigit(kst.getDate());
  return `${y}${m}${d}`;
}

// === 라인 빌더 ===

/**
 * 여러 줄을 LF 로 합친다. 배열 원소는 평탄화. null/undefined 는 무시.
 */
export function joinLines(...lines: Array<string | string[] | null | undefined>): string {
  const out: string[] = [];
  for (const line of lines) {
    if (line == null) continue;
    if (Array.isArray(line)) {
      for (const sub of line) {
        if (sub != null) out.push(sub);
      }
    } else {
      out.push(line);
    }
  }
  return out.join('\n');
}
