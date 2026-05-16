import type { CommandSpec } from '../../routing/router.js';
import { formatGems } from '../../formatters/armories.js';

export const gemsCommand: CommandSpec = {
  minArgs: 1,
  usage: '!보석 캐릭터명',
  description: '해당 캐릭터가 장착 보석',
  handler: async (args, _message, ctx) => {
    const name = args[0]!;
    try {
      const detail = await ctx.armoriesService.getCharacterDetailPartial(name, ['gems']);
      if (!detail?.gems) return `${name} 을(를) 찾을 수 없습니다.`;
      return formatGems(name, detail);
    } catch (err) {
      ctx.logger.warn({ name, err: String(err) }, 'gems command failed');
      return `${name} 은(는) 없는 것 같숨미당`;
    }
  },
};
