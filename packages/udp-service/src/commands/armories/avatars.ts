import type { CommandSpec } from '../../routing/router.js';
import { formatAvatars } from '../../formatters/armories.js';

export const avatarsCommand: CommandSpec = {
  minArgs: 1,
  usage: '!착장 캐릭터명',
  description: '현 착용중인 아바타 목록',
  handler: async (args, _message, ctx) => {
    const name = args[0]!;
    try {
      const detail = await ctx.armoriesService.getCharacterDetailPartial(name, ['avatars']);
      if (!detail?.avatars) return `${name} 은(는) 착용 아바타가 없는 것 같숨미당.`;
      return formatAvatars(name, detail);
    } catch (err) {
      ctx.logger.warn({ name, err: String(err) }, 'avatars command failed');
      return `${name} 은(는) 없는 것 같숨미당`;
    }
  },
};
