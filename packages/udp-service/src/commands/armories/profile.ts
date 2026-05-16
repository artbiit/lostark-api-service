import type { CommandSpec } from '../../routing/router.js';
import { formatProfile } from '../../formatters/armories.js';

export const profileCommand: CommandSpec = {
  minArgs: 1,
  usage: '!정보 캐릭터명',
  description: '해당 캐릭터의 요약 정보',
  handler: async (args, _message, ctx) => {
    const name = args[0]!;
    try {
      const detail = await ctx.armoriesService.getCharacterDetailPartial(name, [
        'profile',
        'engravings',
      ]);
      if (!detail?.profile) return `${name} 을(를) 찾을 수 없습니다.`;
      return formatProfile(name, detail);
    } catch (err) {
      ctx.logger.warn({ name, err: String(err) }, 'profile command failed');
      return `${name} 은(는) 없는 것 같숨미당`;
    }
  },
};
