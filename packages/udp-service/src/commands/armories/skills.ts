import type { CommandSpec } from '../../routing/router.js';
import { formatSkills } from '../../formatters/armories.js';

export const skillsCommand: CommandSpec = {
  minArgs: 1,
  usage: '!스킬 캐릭터명',
  description: '해당 캐릭터의 2레벨 이상의 스킬들',
  handler: async (args, _message, ctx) => {
    const name = args[0]!;
    try {
      const detail = await ctx.armoriesService.getCharacterDetailPartial(name, ['combat-skills']);
      if (!detail?.combatSkills) return `${name} 을(를) 찾을 수 없습니다.`;
      return formatSkills(name, detail);
    } catch (err) {
      ctx.logger.warn({ name, err: String(err) }, 'skills command failed');
      return `${name} 은(는) 없는 것 같숨미당`;
    }
  },
};
