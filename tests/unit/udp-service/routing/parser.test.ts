/**
 * parseCommand 단위 테스트.
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { parseCommand } from '@lostark/udp-gateway/routing/parser.js';

test('parseCommand', async (t) => {
  await t.test('returns null when content does not start with prefix', () => {
    assert.strictEqual(parseCommand('hello', '!'), null);
  });

  await t.test('returns null when content is only prefix', () => {
    assert.strictEqual(parseCommand('!', '!'), null);
  });

  await t.test('returns null when content is empty', () => {
    assert.strictEqual(parseCommand('', '!'), null);
  });

  await t.test('returns null for non-string content', () => {
    // @ts-expect-error 의도적 잘못된 입력
    assert.strictEqual(parseCommand(undefined, '!'), null);
  });

  await t.test('parses single token command', () => {
    const result = parseCommand('!주사위', '!');
    assert.deepStrictEqual(result, { name: '주사위', args: [], raw: '!주사위' });
  });

  await t.test('parses command with args', () => {
    const result = parseCommand('!정보 아트네', '!');
    assert.deepStrictEqual(result, { name: '정보', args: ['아트네'], raw: '!정보 아트네' });
  });

  await t.test('splits on multiple whitespace characters', () => {
    const result = parseCommand('!vs  a   b\tc', '!');
    assert.deepStrictEqual(result?.args, ['a', 'b', 'c']);
  });

  await t.test('respects custom prefix', () => {
    const result = parseCommand('?ping', '?');
    assert.strictEqual(result?.name, 'ping');
  });

  await t.test('trims leading/trailing whitespace', () => {
    const result = parseCommand('  !정보 아트네  ', '!');
    assert.strictEqual(result?.name, '정보');
    assert.deepStrictEqual(result?.args, ['아트네']);
  });
});
