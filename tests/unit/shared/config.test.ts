/**
 * @cursor-change: 2025-01-27, v1.0.0, shared config 모듈 단위 테스트
 *
 * shared 패키지의 config 모듈에 대한 단위 테스트
 * - 환경변수 로딩
 * - 설정 검증
 * - 타입 안전성
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { setupTestEnvironment, validateTestEnvironment } from '../../common/test-utils';

test('Shared Config Module', async (t) => {
  await t.test('setupTestEnvironment should load environment variables', () => {
    const env = setupTestEnvironment();

    assert(env !== undefined);
    assert(typeof env === 'object');
    assert(Object.keys(env).length > 0);
  });

  await t.test('validateTestEnvironment should check required variables', () => {
    const env = validateTestEnvironment();

    assert(env.LOSTARK_API_KEY !== undefined);
    assert(env.LOSTARK_API_KEY.length > 0);
  });

  await t.test('environment should have correct API version', () => {
    const env = setupTestEnvironment();

    assert.strictEqual(env.LOSTARK_API_VERSION, 'V9.0.0');
  });

  await t.test('environment should have correct default ports', () => {
    const env = setupTestEnvironment();

    assert.strictEqual(env.REST_API_PORT, 3000);
    assert.strictEqual(env.UDP_GATEWAY_PORT, 3001);
  });

  await t.test('environment should have correct rate limits', () => {
    const env = setupTestEnvironment();

    assert.strictEqual(env.FETCH_RATE_LIMIT_PER_MINUTE, 100);
    assert.strictEqual(env.FETCH_RETRY_ATTEMPTS, 3);
  });
});
