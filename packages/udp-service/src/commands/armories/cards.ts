import type { CommandSpec } from '../../routing/router.js';
import { formatCards } from '../../formatters/armories.js';

export const cardsCommand: CommandSpec = {
  minArgs: 1,
  usage: '!카드 캐릭터명',
  description: '해당 캐릭터의 장착 카드 및 세트 효과',
  handler: async (args, _message, ctx) => {
    const name = args[0]!;
    try {
      const detail = await ctx.armoriesService.getCharacterDetailPartial(name, ['cards']);
      if (!detail?.cards) return `${name} 은(는) 장착중인 카드가 없는 것 같숨미당.`;
      return formatCards(name, detail);
    } catch (err) {
      ctx.logger.warn({ name, err: String(err) }, 'cards command failed');
      return `${name} 은(는) 없는 것 같숨미당`;
    }
  },
};
