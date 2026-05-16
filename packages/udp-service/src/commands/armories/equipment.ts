import type { CommandSpec } from '../../routing/router.js';
import { formatEquipment } from '../../formatters/armories.js';

export const equipmentCommand: CommandSpec = {
  minArgs: 1,
  usage: '!장비 캐릭터명',
  description: '해당 캐릭터의 장비 정보',
  handler: async (args, _message, ctx) => {
    const name = args[0]!;
    try {
      const detail = await ctx.armoriesService.getCharacterDetailPartial(name, [
        'profile',
        'equipment',
      ]);
      if (!detail?.equipment) return `${name} 은(는) 장착중인 장비가 없는 것 같숨미당.`;
      return formatEquipment(name, detail);
    } catch (err) {
      ctx.logger.warn({ name, err: String(err) }, 'equipment command failed');
      return `${name} 은(는) 없는 것 같숨미당`;
    }
  },
};
