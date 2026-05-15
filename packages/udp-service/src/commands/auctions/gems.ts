import type { CommandSpec } from '../../routing/router.js';
import { formatGemSearch } from '../../formatters/auctions.js';

export const gemSearchCommand: CommandSpec = {
  minArgs: 1,
  usage: '!보석값 아이템명 [추가키워드…]',
  description: '경매장에서 현 보석값 정보',
  handler: async (args, _message, ctx) => {
    const itemName = args.join(' ');
    try {
      const result = await ctx.auctionsService.searchItemsSimple(itemName, 1, 210000);
      return formatGemSearch(itemName, result);
    } catch (err) {
      ctx.logger.warn('gemSearch command failed', { itemName, err: String(err) });
      return `${itemName} 검색에 실패했습니다.`;
    }
  },
};
