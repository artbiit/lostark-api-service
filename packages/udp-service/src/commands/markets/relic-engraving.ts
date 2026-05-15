import type { CommandSpec } from '../../routing/router.js';
import { formatEngravingSearch } from '../../formatters/markets.js';

export const relicEngravingCommand: CommandSpec = {
  minArgs: 1,
  usage: '!유각 각인명',
  description: '유각 최저가 검색',
  handler: async (args, _message, ctx) => {
    const itemName = args.join(' ');
    try {
      const result = await ctx.marketsService.searchItemsAdvanced({
        CategoryCode: 40000,
        ItemGrade: '유물',
        ItemName: itemName,
        Sort: 'CURRENT_MIN_PRICE' as any,
        SortCondition: 'DESC' as any,
        PageNo: 1,
      });
      return formatEngravingSearch(result as any);
    } catch (err) {
      ctx.logger.warn('relicEngraving command failed', { itemName, err: String(err) });
      return `${itemName} 검색에 실패했습니다.`;
    }
  },
};
