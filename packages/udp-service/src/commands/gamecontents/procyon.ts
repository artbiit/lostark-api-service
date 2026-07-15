import type { CommandSpec } from '../../routing/router.js';
import { formatProcyon } from '../../formatters/gamecontents.js';

export const procyonCommand: CommandSpec = {
  minArgs: 0,
  usage: '!프로키온',
  description: '금일 프로키온의 나침반 목록',
  handler: async (_args, _message, ctx) => {
    try {
      const result = await ctx.gameContentsService.getCalendarWithCache();
      if (result.stale) {
        // BRANCH: stale — 점검(공식 API 503)으로 신선 데이터를 못 얻어 SWR stale
        // fallback 을 서빙 중. formatProcyon 의 미래필터가 stale row 를 "오늘"로
        // 오인해 전멸시키는 대신, 점검 중임을 정직하게 알린다 (ADR-0004).
        return '로스트아크 점검 중으로 최신 프로키온 정보를 불러올 수 없습니다.';
      }
      // BRANCH: fresh — 신선 데이터. 기존 포맷 뷰 그대로.
      return formatProcyon(result.data as any);
    } catch (err) {
      // BRANCH: maintenance — 점검 + stale row 도 없어 MaintenanceUnavailableError
      // 등이 throw 된 경우. 기존 메시지 보존.
      ctx.logger.warn({ err: String(err) }, 'procyon command failed');
      return '프로키온 정보를 불러올 수 없습니다.';
    }
  },
};
