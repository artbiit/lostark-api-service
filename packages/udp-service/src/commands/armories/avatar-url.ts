import type { CommandSpec } from '../../routing/router.js';
import { formatAvatarUrl } from '../../formatters/armories.js';

export const avatarUrlCommand: CommandSpec = {
  minArgs: 1,
  usage: '!아바타 캐릭터명',
  description: '해당 캐릭터의 아바타 url을 가져옵니다.',
  handler: async (args, _message, ctx) => {
    const name = args[0]!;
    try {
      const detail = await ctx.armoriesService.getCharacterDetailPartial(name, ['profile']);
      if (!detail?.profile) return `${name} 을(를) 찾을 수 없습니다.`;
      return formatAvatarUrl(name, detail);
    } catch (err) {
      ctx.logger.warn('avatarUrl command failed', { name, err: String(err) });
      return `${name} 은(는) 없는 것 같숨미당`;
    }
  },
};
