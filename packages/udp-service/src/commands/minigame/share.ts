import type { CommandSpec } from '../../routing/router.js';

const FEE_RATE = 0.05;
const FACTOR = 1 - FEE_RATE;
const PARTY_SIZES = [4, 8] as const;

function bidMaxConsume(P: number, N: number): number {
  return Math.floor((P * FACTOR * (N - 1)) / N);
}

function bidMaxResell(P: number, N: number): number {
  return Math.floor((P * FACTOR * FACTOR * (N - 1)) / N);
}

function nonWinnerShare(P: number, N: number): number {
  const X = (P * FACTOR * (N - 1)) / N;
  return Math.floor((X * FACTOR) / N);
}

function formatGold(n: number): string {
  return n.toLocaleString('ko-KR');
}

function ratio(value: number, P: number): string {
  return `${((value / P) * 100).toFixed(1)}%`;
}

const labels: Record<number, string> = {
  4: '[4인 파티]',
  8: '[8인 레이드]',
};

export const shareCommand: CommandSpec = {
  minArgs: 1,
  usage: '!분배금 금액',
  description: 'PVE 전리품 경매 손익분기 입찰 한도(시장가 기준)',
  handler: async (args) => {
    const gold = Number(args[0] ?? 0);
    if (!Number.isFinite(gold) || gold <= 0) {
      return '!분배금 금액';
    }

    const lines: string[] = [`시장최저가 ${formatGold(gold)}골드`];

    for (const n of PARTY_SIZES) {
      const consume = bidMaxConsume(gold, n);
      const resell = bidMaxResell(gold, n);
      const share = nonWinnerShare(gold, n);
      lines.push('');
      lines.push(labels[n] ?? `[${n}인]`);
      lines.push(` 자가소비 한도 : ${formatGold(consume)} (${ratio(consume, gold)})`);
      lines.push(` 재판매 한도   : ${formatGold(resell)} (${ratio(resell, gold)})`);
      lines.push(` 비낙찰 분배   : ${formatGold(share)}`);
    }

    lines.push('');
    lines.push('※ 거래소 수수료 5% 1회 반영. 한도 = 손익분기 최대 입찰가.');

    return lines.join('\n');
  },
};
