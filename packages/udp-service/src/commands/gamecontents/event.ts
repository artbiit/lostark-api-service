import type { CommandSpec } from '../../routing/router.js';
import { formatEvents } from '../../formatters/gamecontents.js';

export const eventCommand: CommandSpec = {
  minArgs: 0,
  usage: '!이벤트',
  description: '진행중이거나 보상 기간이 남은 이벤트 목록',
  handler: async (_args, _message, ctx) => {
    try {
      const result = await ctx.newsService.getActiveEvents();
      return formatEvents(result);
    } catch (err) {
      ctx.logger.warn('event command failed', { err: String(err) });
      return '이벤트 정보를 불러올 수 없습니다.';
    }
  },
};
