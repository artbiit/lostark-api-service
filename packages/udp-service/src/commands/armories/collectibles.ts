import type { CommandSpec } from '../../routing/router.js';
import { formatCollectibles } from '../../formatters/armories.js';

export const collectiblesCommand: CommandSpec = {
  minArgs: 1,
  usage: '!수집 캐릭터명',
  description: '해당 캐릭터 수집포인트',
  handler: async (args, _message, ctx) => {
    const name = args[0]!;
    try {
      const detail = await ctx.armoriesService.getCharacterDetailPartial(name, ['collectibles']);
      if (!detail?.collectibles) return `${name} 은(는) 수집 포인트가 없는 것 같숨미당.`;
      return formatCollectibles(name, detail);
    } catch (err) {
      ctx.logger.warn({ name, err: String(err) }, 'collectibles command failed');
      return `${name} 은(는) 없는 것 같숨미당`;
    }
  },
};
