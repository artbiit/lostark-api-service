import type { CommandSpec } from '../../routing/router.js';
import { formatAbyss } from '../../formatters/gamecontents.js';

export const abyssCommand: CommandSpec = {
  minArgs: 0,
  usage: '!도비스',
  description: '금주의 도전 어비스 던전',
  handler: async (_args, _message, ctx) => {
    try {
      const calendar = await ctx.gameContentsService.getCalendar();
      return formatAbyss(calendar as any);
    } catch (err) {
      ctx.logger.warn('abyss command failed', { err: String(err) });
      return '도비스 정보를 불러올 수 없습니다.';
    }
  },
};
