import type { CommandSpec } from '../../routing/router.js';
import { formatProcyon } from '../../formatters/gamecontents.js';

export const procyonCommand: CommandSpec = {
  minArgs: 0,
  usage: '!프로키온',
  description: '금일 프로키온의 나침반 목록',
  handler: async (_args, _message, ctx) => {
    try {
      const calendar = await ctx.gameContentsService.getCalendar();
      return formatProcyon(calendar as any);
    } catch (err) {
      ctx.logger.warn('procyon command failed', { err: String(err) });
      return '프로키온 정보를 불러올 수 없습니다.';
    }
  },
};
