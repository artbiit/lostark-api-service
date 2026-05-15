/**
 * formatters/kakao.ts 공용 유틸 단위 테스트.
 */

import assert from 'node:assert';
import { test } from 'node:test';

import {
  EMOJI,
  dayOfWeekKR,
  elapsedTime,
  joinLines,
  kstDateKey,
  nowKST,
  padItemLevel,
  padQuality,
  padTwoDigit,
  remainingTime,
  sectionHeader,
  ttlUntilKSTMidnightSeconds,
} from '@lostark/udp-gateway/formatters/kakao.js';

test('padStart helpers', async (t) => {
  await t.test('padQuality pads to 3 digits', () => {
    assert.strictEqual(padQuality(7), '007');
    assert.strictEqual(padQuality(100), '100');
  });
  await t.test('padItemLevel pads to 4 digits', () => {
    assert.strictEqual(padItemLevel(1620), '1620');
    assert.strictEqual(padItemLevel(99), '0099');
  });
  await t.test('padTwoDigit pads to 2 digits', () => {
    assert.strictEqual(padTwoDigit(5), '05');
    assert.strictEqual(padTwoDigit(12), '12');
  });
});

test('sectionHeader wraps in angle brackets', () => {
  assert.strictEqual(sectionHeader('아트네의 장비'), '<아트네의 장비>');
});

test('EMOJI constants', () => {
  assert.strictEqual(EMOJI.TRANSCENDENCE, '⚜️');
  assert.strictEqual(EMOJI.ADVANCED_REFORGE, '🔱');
});

test('elapsedTime', async (t) => {
  await t.test('returns "방금 전" for current time', () => {
    const now = new Date('2026-05-16T00:00:00Z');
    assert.strictEqual(elapsedTime(now, now), '방금 전');
  });

  await t.test('returns 분 전 for minutes ago', () => {
    const now = new Date('2026-05-16T00:10:00Z');
    const past = new Date('2026-05-16T00:05:00Z');
    assert.strictEqual(elapsedTime(past, now), '5분 전');
  });

  await t.test('returns 시간 전 for hours ago', () => {
    const now = new Date('2026-05-16T03:00:00Z');
    const past = new Date('2026-05-16T00:00:00Z');
    assert.strictEqual(elapsedTime(past, now), '3시간 전');
  });
});

test('remainingTime', async (t) => {
  await t.test('returns N시간 후 for hours later', () => {
    const now = new Date('2026-05-16T00:00:00Z');
    const target = new Date('2026-05-16T02:30:00Z');
    assert.strictEqual(remainingTime(target, now), '2시간 후');
  });

  await t.test('returns N일 후 for days later', () => {
    const now = new Date('2026-05-16T00:00:00Z');
    const target = new Date('2026-05-19T00:00:00Z');
    assert.strictEqual(remainingTime(target, now), '3일 후');
  });

  await t.test('returns 방금 전 for past time', () => {
    const now = new Date('2026-05-16T00:00:00Z');
    const past = new Date('2026-05-15T00:00:00Z');
    assert.strictEqual(remainingTime(past, now), '방금 전');
  });
});

test('dayOfWeekKR returns Korean day name', () => {
  // 2026-05-16 is a Saturday (week index 6).
  const date = new Date('2026-05-16T03:00:00Z');
  assert.strictEqual(dayOfWeekKR(date), ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][date.getDay()]);
});

test('nowKST returns a Date object', () => {
  const result = nowKST();
  assert.ok(result instanceof Date);
});

test('ttlUntilKSTMidnightSeconds is between 1 and 24h', () => {
  const ttl = ttlUntilKSTMidnightSeconds();
  assert.ok(ttl >= 1);
  assert.ok(ttl <= 60 * 60 * 24);
});

test('kstDateKey is YYYYMMDD', () => {
  const key = kstDateKey();
  assert.match(key, /^\d{8}$/);
});

test('joinLines joins lines with LF, skipping nulls', () => {
  const out = joinLines('a', null, ['b', 'c'], undefined, 'd');
  assert.strictEqual(out, 'a\nb\nc\nd');
});
