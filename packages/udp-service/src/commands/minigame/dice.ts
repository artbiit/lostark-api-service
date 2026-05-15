import type { CommandSpec } from '../../routing/router.js';

export const diceCommand: CommandSpec = {
  minArgs: 0,
  usage: '!주사위 [최소] [최대]',
  description: '0~100 또는 !주사위 5 10 → 5~10 사이 난수',
  handler: async (args) => {
    const start = Math.ceil(Number(args[0] ?? 0));
    const end = Math.floor(Number(args[1] ?? 100));
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      return '주사위 결과 : 0';
    }
    const result = Math.floor(Math.random() * (end - start + 1) + start);
    return `주사위 결과 : ${result}`;
  },
};
