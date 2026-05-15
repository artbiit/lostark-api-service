/**
 * auctions 그룹 명령(!보석값) 의 카카오톡 포맷터.
 */

import { joinLines } from './kakao.js';

interface AuctionSearchResultLike {
  items: Array<{
    name: string;
    auctionInfo: { buyPrice: number };
    options?: Array<{ className?: string }>;
  }>;
  totalCount?: number;
}

export function formatGemSearch(query: string, result: AuctionSearchResultLike): string {
  const items = result.items ?? [];
  if (items.length === 0) {
    return `${query} 못찾았슴미다.`;
  }

  const first = items[0]!;
  const lines: string[] = [
    `[${first.name}] 검색 결과`,
    `[최저가] : ${first.auctionInfo.buyPrice.toLocaleString()}`,
  ];

  const count = Math.min(10, items.length);
  let sum = 0;
  const list: string[] = [];
  for (let i = 0; i < count; i++) {
    const item = items[i]!;
    sum += item.auctionInfo.buyPrice;
    const klass = item.options?.[0]?.className ?? '';
    list.push(` ${item.auctionInfo.buyPrice.toLocaleString()} (${klass})`);
  }
  const avg = Math.floor(sum / count);
  lines.push(`[평균가] : ${avg.toLocaleString()}`);
  lines.push('');
  lines.push(`최저가 ${count}개 목록`);
  lines.push(...list);

  return joinLines(...lines);
}
