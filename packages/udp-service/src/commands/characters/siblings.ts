import type { CommandSpec } from '../../routing/router.js';
import { formatSiblings } from '../../formatters/characters.js';

export const siblingsCommand: CommandSpec = {
  minArgs: 1,
  usage: '!부캐 캐릭터명',
  description: '해당 캐릭터와 같은 서버 캐릭 목록',
  handler: async (args, _message, ctx) => {
    const name = args[0]!;
    try {
      const result = await ctx.charactersService.processCharacterSiblings(name);
      return formatSiblings(name, result);
    } catch (err) {
      ctx.logger.warn('siblings command failed', { name, err: String(err) });
      return `${name} 캐릭터는 없는 것 같숨미당`;
    }
  },
};
