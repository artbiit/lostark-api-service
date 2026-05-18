/**
 * gamecontents formatter (!프로키온/!이벤트) 단위 테스트.
 *
 * - formatProcyon: PROCYON_CATEGORIES 항목 + 빈 결과 fallback
 * - formatEvents: 미래 이벤트 + 빈 결과 fallback
 *
 * 2026-05-16: formatAbyss / formatGuardian 제거됨 (ADR-0003).
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { formatEvents, formatProcyon } from '@lostark/udp-gateway/formatters/gamecontents.js';

// === formatProcyon ===

test('formatProcyon — renders categories with future start times', () => {
  // now 를 KST 2026-05-16 12:00 으로 고정. nowKST() 는 toLocaleString 으로
  // KST wall-clock 을 재구성하므로 host TZ 와 무관하다.
  const now = new Date('2026-05-16T03:00:00Z'); // KST 12:00
  const contents = [
    {
      CategoryName: '모험 섬',
      ContentsName: '죽음의 협곡',
      StartTimes: ['2026-05-16T15:00:00'],
      RewardItems: [{ Items: [{ Name: '실링 100' }, { Name: '카드 봉투' }] }],
    },
    {
      CategoryName: '카오스게이트',
      ContentsName: '카오스 게이트',
      StartTimes: ['2026-05-16T18:00:00'],
    },
    // 지난 시각은 무시되어야 함
    {
      CategoryName: '필드보스',
      ContentsName: '엘레메니아',
      StartTimes: ['2026-05-16T10:00:00'],
    },
  ];
  const out = formatProcyon(contents as any, now);
  assert.match(out, /의 프로키온의 나침반/);
  assert.match(out, /\[모험 섬\]/);
  assert.match(out, /죽음의 협곡/);
  assert.match(out, /실링/);
  assert.match(out, /\[카오스게이트\]/);
  assert.ok(!out.includes('엘레메니아'));
  assert.ok(!out.includes('아브렐슈드'));
});

test('formatProcyon — returns fallback when no future contents', () => {
  const now = new Date('2026-05-16T23:00:00Z');
  const out = formatProcyon([], now);
  assert.strictEqual(out, '금일 주요 콘텐츠는 더이상 없습니다.');
});

// === formatEvents ===

test('formatEvents — renders future events', () => {
  const now = new Date('2026-05-16T00:00:00Z');
  const result = {
    events: [
      {
        title: '봄맞이 이벤트',
        endDate: '2026-05-20T00:00:00Z',
        rewardDate: null,
      },
      {
        title: '여름 이벤트',
        endDate: '2026-06-01T00:00:00Z',
        rewardDate: '2026-06-10T00:00:00Z',
      },
      // 지난 이벤트는 제외
      {
        title: '겨울 종료',
        endDate: '2026-05-10T00:00:00Z',
        rewardDate: null,
      },
    ],
  };
  const out = formatEvents(result, now);
  assert.match(out, /이벤트 정보/);
  assert.match(out, /1\. 봄맞이 이벤트/);
  assert.match(out, /남은 기간 :/);
  assert.match(out, /2\. 여름 이벤트/);
  assert.match(out, /보상 종료 :/);
  assert.ok(!out.includes('겨울 종료'));
});

test('formatEvents — returns fallback when no events', () => {
  const out = formatEvents({ events: [] });
  assert.strictEqual(out, '진행 중인 이벤트가 없습니다.');
});

test('formatEvents — returns fallback when all events expired', () => {
  const now = new Date('2026-12-31T00:00:00Z');
  const result = {
    events: [{ title: '지난 이벤트', endDate: '2026-01-01T00:00:00Z', rewardDate: null }],
  };
  const out = formatEvents(result, now);
  assert.strictEqual(out, '진행 중인 이벤트가 없습니다.');
});
