import type { CommandSpec } from '../../routing/router.js';
import { formatExpensiveEngravings } from '../../formatters/markets.js';

export const expensiveEngravingsCommand: CommandSpec = {
  minArgs: 0,
  usage: '!비싼유각',
  description: '최저가 기준 상위 10개 유각 가격',
  handler: async (_args, _message, ctx) => {
    try {
      const result = await ctx.marketsService.searchItemsAdvanced({
        CategoryCode: 40000,
        ItemGrade: '유물',
        Sort: 'CURRENT_MIN_PRICE' as any,
        SortCondition: 'DESC' as any,
        PageNo: 1,
      });
      return formatExpensiveEngravings(result as any);
    } catch (err) {
      ctx.logger.warn('expensiveEngravings command failed', { err: String(err) });
      return '각인서 정보를 불러올 수 없습니다.';
    }
  },
};
