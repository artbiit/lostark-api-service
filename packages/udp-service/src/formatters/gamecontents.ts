/**
 * gamecontents/news 그룹 명령의 카카오톡 포맷터.
 * - 프로키온의 나침반 (calendar 필터)
 * - 이벤트 (NewsService.getActiveEvents)
 * - 도비스 / 도가토 (calendar CategoryName 필터)
 */

import {
  ADVENTURE_REWARD_KEYWORDS,
  CALENDAR_CATEGORIES,
  PROCYON_CATEGORIES,
} from '../commands/gamecontents/category-map.js';
import { dayOfWeekKR, joinLines, nowKST, remainingTime } from './kakao.js';

interface CalendarContent {
  CategoryName: string;
  ContentsName: string;
  MinItemLevel?: number;
  Location?: string;
  StartTimes: string[];
  RewardItems?: Array<{
    Items?: Array<{ Name: string }>;
  }>;
}

export function formatProcyon(contents: CalendarContent[], now: Date = new Date()): string {
  const kstNow = nowKST(now);

  // 카테고리별로 남은 항목을 모은다.
  const grouped = new Map<string, Array<{ name: string; date: Date; rewards: string[] }>>();
  for (const c of contents) {
    if (!PROCYON_CATEGORIES.includes(c.CategoryName)) continue;
    if (!Array.isArray(c.StartTimes) || c.StartTimes.length === 0) continue;

    // 오늘 KST 안에서 아직 안 지난 시작시간만 사용.
    const upcoming = c.StartTimes.map((s) => new Date(s)).filter((d) => d.getTime() > kstNow.getTime());
    if (upcoming.length === 0) continue;
    upcoming.sort((a, b) => a.getTime() - b.getTime());
    const earliest = upcoming[0]!;

    // 모험 섬에 한해 보상 키워드 추출.
    const rewards: string[] = [];
    if (c.CategoryName === CALENDAR_CATEGORIES.ADVENTURE_ISLAND) {
      for (const group of c.RewardItems ?? []) {
        for (const item of group.Items ?? []) {
          const matched = ADVENTURE_REWARD_KEYWORDS.find((kw) => item.Name.includes(kw));
          if (matched && !rewards.includes(matched)) rewards.push(matched);
        }
      }
    }

    const list = grouped.get(c.CategoryName) ?? [];
    list.push({ name: c.ContentsName, date: earliest, rewards });
    grouped.set(c.CategoryName, list);
  }

  if (grouped.size === 0) {
    return '금일 주요 콘텐츠는 더이상 없습니다.';
  }

  const header = `${dayOfWeekKR(kstNow)}의 프로키온의 나침반`;
  const lines: string[] = [header];

  for (const [category, list] of grouped) {
    list.sort((a, b) => a.date.getTime() - b.date.getTime());
    const first = list[0]!;
    lines.push('');
    lines.push(`[${category}] ${remainingTime(first.date, kstNow)}`);
    if (category === CALENDAR_CATEGORIES.ADVENTURE_ISLAND) {
      for (const item of list) {
        const rewardTxt = item.rewards.length > 0 ? ` : ${item.rewards.join(',')}` : '';
        lines.push(`${item.name}${rewardTxt}`);
      }
    }
  }

  return joinLines(...lines);
}

// === 이벤트 ===

interface ActiveEventsResult {
  events: Array<{
    title: string;
    endDate: string;
    rewardDate: string | null;
  }>;
}

export function formatEvents(result: ActiveEventsResult, now: Date = new Date()): string {
  const events = result.events ?? [];
  if (events.length === 0) {
    return '진행 중인 이벤트가 없습니다.';
  }

  const lines: string[] = ['이벤트 정보'];
  let index = 0;
  for (const event of events) {
    const end = new Date(event.endDate);
    const reward = event.rewardDate ? new Date(event.rewardDate) : null;
    const target = reward ?? end;
    if (target.getTime() <= now.getTime()) continue;

    lines.push('');
    lines.push(`${++index}. ${event.title}`);
    if (reward) {
      lines.push(`보상 종료 : ${remainingTime(reward, now)}`);
    } else {
      lines.push(`남은 기간 : ${remainingTime(end, now)}`);
    }
  }

  if (index === 0) return '진행 중인 이벤트가 없습니다.';
  return joinLines(...lines);
}

// === 도비스 ===

export function formatAbyss(contents: CalendarContent[]): string {
  const abyss = contents.filter((c) => c.CategoryName === CALENDAR_CATEGORIES.ABYSS);
  if (abyss.length === 0) {
    return '이번 주 도전 어비스 던전 정보가 없는 것 같숨미당.';
  }
  const lines: string[] = ['[금주의 도비스]'];
  for (const c of abyss) {
    const loc = c.Location ? ` / ${c.Location}` : '';
    lines.push(`${c.ContentsName}${loc}`);
  }
  return joinLines(...lines);
}

// === 도가토 ===

export function formatGuardian(contents: CalendarContent[]): string {
  const guardian = contents.filter((c) => c.CategoryName === CALENDAR_CATEGORIES.GUARDIAN);
  if (guardian.length === 0) {
    return '이번 주 도전 가디언 토벌 정보가 없는 것 같숨미당.';
  }
  const lines: string[] = ['[금주의 도가토]'];
  for (const c of guardian) {
    lines.push(` ${c.ContentsName}`);
  }
  return joinLines(...lines);
}
