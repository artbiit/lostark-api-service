/**
 * markets 그룹(!비싼유각/!전각/!유각) 의 카카오톡 포맷터.
 *
 * MarketSearchResponseV9.Items 는 BaseItem 만 보장하지만 실제 API 응답은
 * 추가 필드(CurrentMinPrice / YDayAvgPrice / RecentPrice) 를 포함한다.
 * V9 타입 정의가 이를 누락하고 있어 본 포맷터는 raw 객체를 받아 안전 접근.
 */

import { joinLines } from './kakao.js';

interface MarketSearchResponseLike {
  Items?: Array<Record<string, unknown>>;
}

function stripBracketPrefixAndSuffix(name: string): string {
  let cleaned = name;
  if (cleaned.startsWith('[')) {
    const close = cleaned.indexOf('] ');
    if (close >= 0) cleaned = cleaned.substring(close + 2);
  }
  cleaned = cleaned.replace(' 각인서', '');
  return cleaned;
}

function readPrice(item: Record<string, unknown>): number {
  const candidates = ['CurrentMinPrice', 'YDayAvgPrice', 'RecentPrice'];
  for (const key of candidates) {
    const v = item[key];
    if (typeof v === 'number') return v;
  }
  return 0;
}

function readName(item: Record<string, unknown>): string {
  return typeof item['Name'] === 'string' ? (item['Name'] as string) : '';
}

export function formatExpensiveEngravings(result: MarketSearchResponseLike): string {
  const items = result.Items ?? [];
  if (items.length === 0) {
    return '각인서를 찾을 수 없습니다.';
  }

  const lines: string[] = ['[비싼 각인서]', ''];
  for (const item of items) {
    const name = stripBracketPrefixAndSuffix(readName(item));
    lines.push(`[${name}] ${readPrice(item).toLocaleString()}`);
  }
  return joinLines(...lines);
}

export function formatEngravingSearch(result: MarketSearchResponseLike): string {
  const items = result.Items ?? [];
  if (items.length === 0) {
    return '각인서를 찾을 수 없습니다.';
  }
  const first = items[0]!;
  const name = stripBracketPrefixAndSuffix(readName(first));
  return `[${name}] : ${readPrice(first).toLocaleString()}`;
}
