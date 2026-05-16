import type { CommandSpec } from '../../routing/router.js';
import { formatColosseums } from '../../formatters/armories.js';

export const colosseumsCommand: CommandSpec = {
  minArgs: 1,
  usage: '!전장 캐릭터명',
  description: '해당 캐릭터의 증명의 전장 시즌별 기록',
  handler: async (args, _message, ctx) => {
    const name = args[0]!;
    try {
      const detail = await ctx.armoriesService.getCharacterDetailPartial(name, ['colosseums']);
      if (!detail?.colosseums) return `${name} 을(를) 찾을 수 없습니다.`;
      return formatColosseums(name, detail);
    } catch (err) {
      ctx.logger.warn({ name, err: String(err) }, 'colosseums command failed');
      return `${name} 은(는) 없는 것 같숨미당`;
    }
  },
};
