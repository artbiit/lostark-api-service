import type { CommandSpec } from '../../routing/router.js';
import { formatAbilityStone } from '../../formatters/armories.js';

export const abilityStoneCommand: CommandSpec = {
  minArgs: 1,
  usage: '!돌 캐릭터명',
  description: '해당 캐릭터의 어빌리티 스톤',
  handler: async (args, _message, ctx) => {
    const name = args[0]!;
    try {
      const detail = await ctx.armoriesService.getCharacterDetailPartial(name, [
        'profile',
        'equipment',
      ]);
      if (!detail?.equipment) return `${name} 은(는) 장착중인 스톤이 없는 것 같숨미당.`;
      return formatAbilityStone(name, detail);
    } catch (err) {
      ctx.logger.warn({ name, err: String(err) }, 'abilityStone command failed');
      return `${name} 은(는) 없는 것 같숨미당`;
    }
  },
};
