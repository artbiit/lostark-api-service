/**
 * @cursor-change: 2024-12-19, 1.0.0, 환경변수 로딩 정규 테스트
 *
 * dotenv + zod를 통한 일관된 환경변수 로딩 테스트
 * - .env 파일 로딩 확인
 * - parseEnv() 함수 검증
 * - 환경변수 스키마 검증
 * - 기본값 적용 확인
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { defaultConfig, envSchema, parseEnv } from '@lostark/shared/config';

test('Environment Variables', async (t) => {
  await t.test('parseEnv() should load environment variables from .env file', () => {
    const env = parseEnv(true, '../../../.env');

    assert(env !== undefined);
    assert(typeof env === 'object');
    assert(Object.keys(env).length > 0);
  });

  await t.test('parseEnv() should have required LOSTARK_API_KEY', () => {
    const env = parseEnv(true, '../../../.env');

    assert(env.LOSTARK_API_KEY !== undefined);
    assert(env.LOSTARK_API_KEY.length > 0);
  });

  await t.test('parseEnv() should apply default values for missing variables', () => {
    const env = parseEnv(true, '../../../.env');

    assert.strictEqual(env.NODE_ENV, 'development');
    assert.strictEqual(env.LOSTARK_API_VERSION, 'V9.0.0');
    assert.strictEqual(env.REST_API_PORT, 3000);
    assert.strictEqual(env.UDP_GATEWAY_PORT, 3001);
  });

  await t.test('parseEnv() should validate environment variable types', () => {
    const env = parseEnv(true, '../../../.env');

    // 숫자 타입 검증
    assert.strictEqual(typeof env.REST_API_PORT, 'number');
    assert.strictEqual(typeof env.UDP_GATEWAY_PORT, 'number');
    assert.strictEqual(typeof env.FETCH_RATE_LIMIT_PER_MINUTE, 'number');
    assert.strictEqual(typeof env.FETCH_RETRY_ATTEMPTS, 'number');

    // 문자열 타입 검증
    assert.strictEqual(typeof env.NODE_ENV, 'string');
    assert.strictEqual(typeof env.LOSTARK_API_KEY, 'string');
    assert.strictEqual(typeof env.LOSTARK_API_VERSION, 'string');

    // 불린 타입 검증
    assert.strictEqual(typeof env.LOG_PRETTY_PRINT, 'boolean');
  });

  await t.test('envSchema should validate environment variables with zod schema', () => {
    const result = envSchema.safeParse(process.env);

    assert(result.success === true);
    if (result.success) {
      assert(result.data !== undefined);
      assert(Object.keys(result.data).length > 0);
    }
  });

  await t.test('envSchema should handle missing optional variables gracefully', () => {
    const testEnv = {
      ...process.env,
      CACHE_REDIS_URL: undefined,
      CACHE_REDIS_PASSWORD: undefined,
    };

    const result = envSchema.safeParse(testEnv);
    assert(result.success === true);
  });

  await t.test('defaultConfig should have all required configuration keys', () => {
    const requiredKeys = [
      'NODE_ENV',
      'LOSTARK_API_KEY',
      'LOSTARK_API_VERSION',
      'REST_API_PORT',
      'UDP_GATEWAY_PORT',
      'FETCH_RATE_LIMIT_PER_MINUTE',
      'FETCH_RETRY_ATTEMPTS',
      'LOG_LEVEL',
    ];

    requiredKeys.forEach((key) => {
      assert(Object.prototype.hasOwnProperty.call(defaultConfig, key), `Missing key: ${key}`);
    });
  });

  await t.test('defaultConfig should have sensible default values', () => {
    assert.strictEqual(defaultConfig.NODE_ENV, 'development');
    assert.strictEqual(defaultConfig.LOSTARK_API_VERSION, 'V9.0.0');
    assert.strictEqual(defaultConfig.REST_API_PORT, 3000);
    assert.strictEqual(defaultConfig.UDP_GATEWAY_PORT, 3001);
    assert.strictEqual(defaultConfig.FETCH_RATE_LIMIT_PER_MINUTE, 100);
    assert.strictEqual(defaultConfig.FETCH_RETRY_ATTEMPTS, 3);
    assert.strictEqual(defaultConfig.LOG_LEVEL, 'info');
  });

  await t.test('Environment variables should validate port numbers are within valid range', () => {
    const env = parseEnv(true, '../../../.env');

    assert(env.REST_API_PORT > 0);
    assert(env.REST_API_PORT <= 65535);
    assert(env.UDP_GATEWAY_PORT > 0);
    assert(env.UDP_GATEWAY_PORT <= 65535);
  });

  await t.test('Environment variables should validate rate limit values are reasonable', () => {
    const env = parseEnv(true, '../../../.env');

    assert(env.FETCH_RATE_LIMIT_PER_MINUTE > 0);
    assert(env.FETCH_RATE_LIMIT_PER_MINUTE <= 1000);
    assert(env.FETCH_RETRY_ATTEMPTS >= 0);
    assert(env.FETCH_RETRY_ATTEMPTS <= 10);
  });

  await t.test('Environment variables should validate log level is valid', () => {
    const env = parseEnv(true, '../../../.env');
    const validLogLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

    assert(validLogLevels.includes(env.LOG_LEVEL));
  });
});
