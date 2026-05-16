import type { CommandSpec } from '../../routing/router.js';
import { formatEngravings } from '../../formatters/armories.js';

export const engravingsCommand: CommandSpec = {
  minArgs: 1,
  usage: '!각인 캐릭터명',
  description: '해당 캐릭터가 장착 각인',
  handler: async (args, _message, ctx) => {
    const name = args[0]!;
    try {
      const detail = await ctx.armoriesService.getCharacterDetailPartial(name, ['engravings']);
      if (!detail?.engravings) return `${name} 은(는) 장착중인 각인이 없는 것 같숨미당.`;
      return formatEngravings(name, detail);
    } catch (err) {
      ctx.logger.warn({ name, err: String(err) }, 'engravings command failed');
      return `${name} 은(는) 없는 것 같숨미당`;
    }
  },
};
