/**
 * !랜전카: sender.hash 기반 하루 한 번 고정 랜덤 카드.
 *
 * 키: udp:randomcard:<senderHash>:<YYYYMMDD KST>
 * TTL: 다음 KST 자정까지 남은 초 (최대 24h).
 *
 * Redis 미연결 환경에서는 fallback 으로 매번 새로 뽑는다 (운영상 허용).
 */

import type { CommandSpec } from '../../routing/router.js';
import { kstDateKey, ttlUntilKSTMidnightSeconds } from '../../formatters/kakao.js';
import { RANDOM_CARD_LIST } from './card-list.js';

const KEY_PREFIX = 'udp:randomcard';

export const randomCardCommand: CommandSpec = {
  minArgs: 0,
  usage: '!랜전카',
  description: '하루 한번 sender 기준 고정 랜덤 카드',
  handler: async (_args, message, ctx) => {
    const hash = message.sender.hash;
    const name = message.sender.name;
    const key = `${KEY_PREFIX}:${hash}:${kstDateKey()}`;

    // 1) 캐시 조회
    let card: string | null = null;
    try {
      const cached = await ctx.redis.get(key);
      if (cached) card = cached;
    } catch (err) {
      ctx.logger.debug({
        err: String(err),
      }, 'randomCard cache lookup failed (fallback to fresh draw)');
    }

    // 2) 미존재 → 추첨 + set
    if (!card) {
      const idx = Math.floor(Math.random() * RANDOM_CARD_LIST.length);
      card = RANDOM_CARD_LIST[idx]!;
      try {
        const ttl = ttlUntilKSTMidnightSeconds();
        await ctx.redis.set(key, card, ttl);
      } catch (err) {
        ctx.logger.debug({
          err: String(err),
        }, 'randomCard cache set failed (continuing without persist)');
      }
    }

    return `${name}님의 오늘의 랜전카\n${card}`;
  },
};
