import type { CommandSpec } from '../../routing/router.js';
import { formatGuardian } from '../../formatters/gamecontents.js';

export const guardianCommand: CommandSpec = {
  minArgs: 0,
  usage: '!도가토',
  description: '금주의 도전 가디언 토벌 목록',
  handler: async (_args, _message, ctx) => {
    try {
      const calendar = await ctx.gameContentsService.getCalendar();
      return formatGuardian(calendar as any);
    } catch (err) {
      ctx.logger.warn('guardian command failed', { err: String(err) });
      return '도가토 정보를 불러올 수 없습니다.';
    }
  },
};
