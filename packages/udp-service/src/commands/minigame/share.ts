import type { CommandSpec } from '../../routing/router.js';

export const shareCommand: CommandSpec = {
  minArgs: 1,
  usage: '!분배금 금액',
  description: '경매장 수수료를 고려해 인원당 적정 입찰가',
  handler: async (args) => {
    const gold = Number(args[0] ?? 0);
    if (!Number.isFinite(gold) || gold <= 0) {
      return '!분배금 금액';
    }
    const populations = [4, 8, 16];
    const lines: string[] = [`입력된 금액 : ${gold.toLocaleString()}`];
    const afterFee = gold * 0.95;
    lines[0] = `입력된 금액 : ${gold.toLocaleString()} -> ${afterFee.toLocaleString()}`;
    for (const p of populations) {
      const share = Math.floor(afterFee * ((p - 1) / p));
      lines.push(`${p}인 기준 : ${share.toLocaleString()}`);
    }
    return lines.join('\n');
  },
};
