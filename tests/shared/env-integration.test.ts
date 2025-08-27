/**
 * @cursor-change: 2024-12-19, 1.0.0, 환경변수 통합 테스트
 *
 * 각 패키지에서 일관되게 환경 변수를 불러오는지 확인
 * - dotenv, zod를 이용한 불러오기, 검증 작업 진행
 * - 누락된 환경 변수 확인
 * - 테스트 중 프리징 및 무한대기 방지
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { defaultConfig, parseEnv } from '../../packages/shared/dist/config/env.js';

test('Environment Variables Integration', async (t) => {
  await t.test('Environment variables should be properly validated with zod', () => {
    const env = parseEnv(true, '../../.env');

    // 필수 환경 변수 존재 확인
    assert(env.LOSTARK_API_KEY && env.LOSTARK_API_KEY.length > 0, 'LOSTARK_API_KEY is required');

    // 타입 검증
    assert(typeof env.REST_API_PORT === 'number', 'REST_API_PORT should be a number');
    assert(typeof env.UDP_GATEWAY_PORT === 'number', 'UDP_GATEWAY_PORT should be a number');
    assert(
      typeof env.FETCH_RATE_LIMIT_PER_MINUTE === 'number',
      'FETCH_RATE_LIMIT_PER_MINUTE should be a number',
    );
    assert(typeof env.LOG_LEVEL === 'string', 'LOG_LEVEL should be a string');
    assert(typeof env.LOG_PRETTY_PRINT === 'boolean', 'LOG_PRETTY_PRINT should be a boolean');

    // 값 범위 검증
    assert(
      env.REST_API_PORT > 0 && env.REST_API_PORT <= 65535,
      'REST_API_PORT should be in valid range',
    );
    assert(
      env.UDP_GATEWAY_PORT > 0 && env.UDP_GATEWAY_PORT <= 65535,
      'UDP_GATEWAY_PORT should be in valid range',
    );
    assert(env.FETCH_RATE_LIMIT_PER_MINUTE > 0, 'FETCH_RATE_LIMIT_PER_MINUTE should be positive');
    assert(env.FETCH_RETRY_ATTEMPTS >= 0, 'FETCH_RETRY_ATTEMPTS should be non-negative');
  });

  await t.test('No missing environment variables should exist', () => {
    const env = parseEnv(true, '../../.env');

    // 모든 필수 환경 변수 확인
    const requiredVars = [
      'NODE_ENV',
      'LOSTARK_API_KEY',
      'LOSTARK_API_VERSION',
      'REST_API_PORT',
      'REST_API_HOST',
      'UDP_GATEWAY_PORT',
      'UDP_GATEWAY_HOST',
      'FETCH_RATE_LIMIT_PER_MINUTE',
      'FETCH_RETRY_ATTEMPTS',
      'FETCH_RETRY_DELAY_MS',
      'FETCH_CIRCUIT_BREAKER_THRESHOLD',
      'FETCH_CIRCUIT_BREAKER_TIMEOUT_MS',
      'CACHE_MEMORY_TTL_SECONDS',
      'CACHE_REDIS_TTL_SECONDS',
      'LOG_LEVEL',
      'LOG_PRETTY_PRINT',
      'DB_HOST',
      'DB_PORT',
      'DB_USERNAME',
      'DB_PASSWORD',
      'DB_DATABASE',
      'DB_CONNECTION_LIMIT',
    ];

    requiredVars.forEach((varName) => {
      assert(
        Object.prototype.hasOwnProperty.call(env, varName),
        `Missing environment variable: ${varName}`,
      );
    });
  });

  await t.test('Environment variable loading should not cause freezing or infinite waiting', () => {
    const startTime = Date.now();

    // 환경 변수 로딩 (타임아웃 테스트)
    const env = parseEnv(true, '../../.env');

    const endTime = Date.now();
    const loadTime = endTime - startTime;

    // 로딩 시간이 5초 이내여야 함 (프리징 방지)
    assert(loadTime < 5000, `Environment variable loading took too long: ${loadTime}ms`);

    // 기본 검증
    assert(env !== undefined, 'Environment variables should be loaded');
    assert(typeof env === 'object', 'Environment variables should be an object');
  });

  await t.test('Environment variables should have reasonable default values', () => {
    const env = parseEnv(true, '../../.env');

    // 기본값 검증
    assert.strictEqual(env.NODE_ENV, 'development', 'NODE_ENV should default to development');
    assert.strictEqual(
      env.LOSTARK_API_VERSION,
      'V9.0.0',
      'LOSTARK_API_VERSION should default to V9.0.0',
    );
    assert.strictEqual(env.REST_API_PORT, 3000, 'REST_API_PORT should default to 3000');
    assert.strictEqual(env.UDP_GATEWAY_PORT, 3001, 'UDP_GATEWAY_PORT should default to 3001');
    assert.strictEqual(
      env.FETCH_RATE_LIMIT_PER_MINUTE,
      100,
      'FETCH_RATE_LIMIT_PER_MINUTE should default to 100',
    );
    assert.strictEqual(env.FETCH_RETRY_ATTEMPTS, 3, 'FETCH_RETRY_ATTEMPTS should default to 3');
    assert.strictEqual(env.LOG_LEVEL, 'info', 'LOG_LEVEL should default to info');
  });

  await t.test('Default config should match environment variable defaults', () => {
    const env = parseEnv(true, '../../.env');

    // defaultConfig와 실제 환경 변수 값 비교
    assert.strictEqual(defaultConfig.NODE_ENV, env.NODE_ENV, 'NODE_ENV should match default');
    assert.strictEqual(
      defaultConfig.LOSTARK_API_VERSION,
      env.LOSTARK_API_VERSION,
      'LOSTARK_API_VERSION should match default',
    );
    assert.strictEqual(
      defaultConfig.REST_API_PORT,
      env.REST_API_PORT,
      'REST_API_PORT should match default',
    );
    assert.strictEqual(
      defaultConfig.UDP_GATEWAY_PORT,
      env.UDP_GATEWAY_PORT,
      'UDP_GATEWAY_PORT should match default',
    );
    assert.strictEqual(
      defaultConfig.FETCH_RATE_LIMIT_PER_MINUTE,
      env.FETCH_RATE_LIMIT_PER_MINUTE,
      'FETCH_RATE_LIMIT_PER_MINUTE should match default',
    );
    assert.strictEqual(
      defaultConfig.FETCH_RETRY_ATTEMPTS,
      env.FETCH_RETRY_ATTEMPTS,
      'FETCH_RETRY_ATTEMPTS should match default',
    );
    assert.strictEqual(defaultConfig.LOG_LEVEL, env.LOG_LEVEL, 'LOG_LEVEL should match default');
  });

  await t.test('Environment variables should be consistent across multiple loads', () => {
    // 여러 번 환경 변수 로딩하여 일관성 확인
    const env1 = parseEnv(true, '../../.env');
    const env2 = parseEnv(true, '../../.env');
    const env3 = parseEnv(true, '../../.env');

    // 동일한 값인지 확인
    assert.strictEqual(env1.LOSTARK_API_KEY, env2.LOSTARK_API_KEY, 'API key should be consistent');
    assert.strictEqual(
      env1.REST_API_PORT,
      env2.REST_API_PORT,
      'REST_API_PORT should be consistent',
    );
    assert.strictEqual(
      env1.UDP_GATEWAY_PORT,
      env2.UDP_GATEWAY_PORT,
      'UDP_GATEWAY_PORT should be consistent',
    );
    assert.strictEqual(env1.LOG_LEVEL, env2.LOG_LEVEL, 'LOG_LEVEL should be consistent');

    assert.strictEqual(env2.LOSTARK_API_KEY, env3.LOSTARK_API_KEY, 'API key should be consistent');
    assert.strictEqual(
      env2.REST_API_PORT,
      env3.REST_API_PORT,
      'REST_API_PORT should be consistent',
    );
    assert.strictEqual(
      env2.UDP_GATEWAY_PORT,
      env3.UDP_GATEWAY_PORT,
      'UDP_GATEWAY_PORT should be consistent',
    );
    assert.strictEqual(env2.LOG_LEVEL, env3.LOG_LEVEL, 'LOG_LEVEL should be consistent');
  });
});
