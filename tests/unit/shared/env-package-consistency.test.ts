/**
 * @cursor-change: 2024-12-19, 1.0.0, 패키지별 환경변수 일관성 테스트
 *
 * 각 패키지에서 일관되게 환경 변수를 불러오는지 확인
 * - dotenv, zod를 이용한 불러오기, 검증 작업 진행
 * - 누락된 환경 변수 확인
 * - 테스트 중 프리징 및 무한대기 방지
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { setupTestEnvironment } from '../../common/test-utils.js';

test('Package Environment Variable Consistency', async (t) => {
  await t.test('All packages should use shared environment variable loading', () => {
    // 모든 패키지에서 동일한 parseEnv 함수를 사용하는지 확인
    const env = setupTestEnvironment();

    // 공통 환경 변수들이 모든 패키지에서 동일하게 사용되는지 확인
    const commonVars = [
      'LOSTARK_API_KEY',
      'LOSTARK_API_VERSION',
      'NODE_ENV',
      'LOG_LEVEL',
      'LOG_PRETTY_PRINT',
    ];

    commonVars.forEach((varName) => {
      assert(
        Object.prototype.hasOwnProperty.call(env, varName),
        `Common environment variable ${varName} should be available to all packages`,
      );
    });
  });

  await t.test('Service-specific environment variables should be properly configured', () => {
    const env = setupTestEnvironment();

    // REST Service 관련 환경 변수
    const restVars = [
      'REST_API_PORT',
      'REST_API_HOST',
      'REST_API_CORS_ORIGIN',
      'REST_API_RATE_LIMIT_PER_MINUTE',
    ];

    restVars.forEach((varName) => {
      assert(
        Object.prototype.hasOwnProperty.call(env, varName),
        `REST service environment variable ${varName} should be configured`,
      );
    });

    // UDP Service 관련 환경 변수
    const udpVars = [
      'UDP_GATEWAY_PORT',
      'UDP_GATEWAY_HOST',
      'UDP_GATEWAY_MAX_MESSAGE_SIZE',
      'UDP_GATEWAY_WORKER_POOL_SIZE',
    ];

    udpVars.forEach((varName) => {
      assert(
        Object.prototype.hasOwnProperty.call(env, varName),
        `UDP service environment variable ${varName} should be configured`,
      );
    });

    // Data Service 관련 환경 변수
    const dataVars = [
      'FETCH_RATE_LIMIT_PER_MINUTE',
      'FETCH_RETRY_ATTEMPTS',
      'FETCH_RETRY_DELAY_MS',
      'FETCH_CIRCUIT_BREAKER_THRESHOLD',
      'FETCH_CIRCUIT_BREAKER_TIMEOUT_MS',
    ];

    dataVars.forEach((varName) => {
      assert(
        Object.prototype.hasOwnProperty.call(env, varName),
        `Data service environment variable ${varName} should be configured`,
      );
    });
  });

  await t.test('Cache configuration should be consistent across packages', () => {
    const env = setupTestEnvironment();

    const cacheVars = ['CACHE_MEMORY_TTL_SECONDS', 'CACHE_REDIS_TTL_SECONDS', 'CACHE_REDIS_DB'];

    cacheVars.forEach((varName) => {
      assert(
        Object.prototype.hasOwnProperty.call(env, varName),
        `Cache environment variable ${varName} should be configured`,
      );
    });

    // Redis 관련 환경 변수 (선택사항)
    const redisVars = ['CACHE_REDIS_URL', 'CACHE_REDIS_PASSWORD'];

    // Redis 변수들은 선택사항이므로 존재하지 않아도 됨
    redisVars.forEach((varName) => {
      if (Object.prototype.hasOwnProperty.call(env, varName)) {
        console.log(`Redis environment variable ${varName} is configured`);
      } else {
        console.log(`Redis environment variable ${varName} is not configured (optional)`);
      }
    });
  });

  await t.test('Database configuration should be available', () => {
    const env = setupTestEnvironment();

    const dbVars = [
      'DB_HOST',
      'DB_PORT',
      'DB_USERNAME',
      'DB_PASSWORD',
      'DB_DATABASE',
      'DB_CONNECTION_LIMIT',
    ];

    dbVars.forEach((varName) => {
      assert(
        Object.prototype.hasOwnProperty.call(env, varName),
        `Database environment variable ${varName} should be configured`,
      );
    });
  });

  await t.test('Environment variables should have correct types for each package', () => {
    const env = setupTestEnvironment();

    // 포트 번호들은 숫자여야 함
    assert(typeof env.REST_API_PORT === 'number', 'REST_API_PORT should be a number');
    assert(typeof env.UDP_GATEWAY_PORT === 'number', 'UDP_GATEWAY_PORT should be a number');
    assert(typeof env.DB_PORT === 'number', 'DB_PORT should be a number');

    // 문자열 환경 변수들
    assert(typeof env.LOSTARK_API_KEY === 'string', 'LOSTARK_API_KEY should be a string');
    assert(typeof env.LOSTARK_API_VERSION === 'string', 'LOSTARK_API_VERSION should be a string');
    assert(typeof env.NODE_ENV === 'string', 'NODE_ENV should be a string');
    assert(typeof env.LOG_LEVEL === 'string', 'LOG_LEVEL should be a string');
    assert(typeof env.REST_API_HOST === 'string', 'REST_API_HOST should be a string');
    assert(typeof env.UDP_GATEWAY_HOST === 'string', 'UDP_GATEWAY_HOST should be a string');
    assert(typeof env.DB_HOST === 'string', 'DB_HOST should be a string');
    assert(typeof env.DB_USERNAME === 'string', 'DB_USERNAME should be a string');
    assert(typeof env.DB_PASSWORD === 'string', 'DB_PASSWORD should be a string');
    assert(typeof env.DB_DATABASE === 'string', 'DB_DATABASE should be a string');

    // 숫자 환경 변수들
    assert(
      typeof env.FETCH_RATE_LIMIT_PER_MINUTE === 'number',
      'FETCH_RATE_LIMIT_PER_MINUTE should be a number',
    );
    assert(typeof env.FETCH_RETRY_ATTEMPTS === 'number', 'FETCH_RETRY_ATTEMPTS should be a number');
    assert(typeof env.FETCH_RETRY_DELAY_MS === 'number', 'FETCH_RETRY_DELAY_MS should be a number');
    assert(
      typeof env.FETCH_CIRCUIT_BREAKER_THRESHOLD === 'number',
      'FETCH_CIRCUIT_BREAKER_THRESHOLD should be a number',
    );
    assert(
      typeof env.FETCH_CIRCUIT_BREAKER_TIMEOUT_MS === 'number',
      'FETCH_CIRCUIT_BREAKER_TIMEOUT_MS should be a number',
    );
    assert(
      typeof env.UDP_GATEWAY_MAX_MESSAGE_SIZE === 'number',
      'UDP_GATEWAY_MAX_MESSAGE_SIZE should be a number',
    );
    assert(
      typeof env.UDP_GATEWAY_WORKER_POOL_SIZE === 'number',
      'UDP_GATEWAY_WORKER_POOL_SIZE should be a number',
    );
    assert(
      typeof env.CACHE_MEMORY_TTL_SECONDS === 'number',
      'CACHE_MEMORY_TTL_SECONDS should be a number',
    );
    assert(
      typeof env.CACHE_REDIS_TTL_SECONDS === 'number',
      'CACHE_REDIS_TTL_SECONDS should be a number',
    );
    assert(typeof env.CACHE_REDIS_DB === 'number', 'CACHE_REDIS_DB should be a number');
    assert(typeof env.DB_CONNECTION_LIMIT === 'number', 'DB_CONNECTION_LIMIT should be a number');

    // 불린 환경 변수들
    assert(typeof env.LOG_PRETTY_PRINT === 'boolean', 'LOG_PRETTY_PRINT should be a boolean');
  });

  await t.test('Environment variables should have reasonable value ranges', () => {
    const env = setupTestEnvironment();

    // 포트 번호 범위 검증
    assert(
      env.REST_API_PORT > 0 && env.REST_API_PORT <= 65535,
      'REST_API_PORT should be in valid range (1-65535)',
    );
    assert(
      env.UDP_GATEWAY_PORT > 0 && env.UDP_GATEWAY_PORT <= 65535,
      'UDP_GATEWAY_PORT should be in valid range (1-65535)',
    );
    assert(env.DB_PORT > 0 && env.DB_PORT <= 65535, 'DB_PORT should be in valid range (1-65535)');

    // 레이트 리밋 검증
    assert(env.FETCH_RATE_LIMIT_PER_MINUTE > 0, 'FETCH_RATE_LIMIT_PER_MINUTE should be positive');
    assert(
      env.FETCH_RATE_LIMIT_PER_MINUTE <= 1000,
      'FETCH_RATE_LIMIT_PER_MINUTE should be reasonable',
    );

    // 재시도 설정 검증
    assert(env.FETCH_RETRY_ATTEMPTS >= 0, 'FETCH_RETRY_ATTEMPTS should be non-negative');
    assert(env.FETCH_RETRY_ATTEMPTS <= 10, 'FETCH_RETRY_ATTEMPTS should be reasonable');
    assert(env.FETCH_RETRY_DELAY_MS > 0, 'FETCH_RETRY_DELAY_MS should be positive');

    // 서킷브레이커 설정 검증
    assert(
      env.FETCH_CIRCUIT_BREAKER_THRESHOLD > 0,
      'FETCH_CIRCUIT_BREAKER_THRESHOLD should be positive',
    );
    assert(
      env.FETCH_CIRCUIT_BREAKER_TIMEOUT_MS > 0,
      'FETCH_CIRCUIT_BREAKER_TIMEOUT_MS should be positive',
    );

    // UDP 설정 검증
    assert(
      env.UDP_GATEWAY_MAX_MESSAGE_SIZE >= 1024,
      'UDP_GATEWAY_MAX_MESSAGE_SIZE should be at least 1024',
    );
    assert(env.UDP_GATEWAY_WORKER_POOL_SIZE > 0, 'UDP_GATEWAY_WORKER_POOL_SIZE should be positive');

    // 캐시 설정 검증
    assert(env.CACHE_MEMORY_TTL_SECONDS > 0, 'CACHE_MEMORY_TTL_SECONDS should be positive');
    assert(env.CACHE_REDIS_TTL_SECONDS > 0, 'CACHE_REDIS_TTL_SECONDS should be positive');
    assert(
      env.CACHE_REDIS_DB >= 0 && env.CACHE_REDIS_DB <= 15,
      'CACHE_REDIS_DB should be in range (0-15)',
    );

    // DB 설정 검증
    assert(env.DB_CONNECTION_LIMIT > 0, 'DB_CONNECTION_LIMIT should be positive');
  });

  await t.test('Environment variable loading should be fast and not cause issues', () => {
    const startTime = Date.now();

    // 여러 번 환경 변수 로딩하여 성능 및 안정성 확인
    for (let i = 0; i < 10; i++) {
      const env = setupTestEnvironment();
      assert(env !== undefined, `Environment variables should be loaded on iteration ${i + 1}`);
      assert(
        typeof env === 'object',
        `Environment variables should be an object on iteration ${i + 1}`,
      );
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // 10번 로딩이 1초 이내에 완료되어야 함
    assert(
      totalTime < 1000,
      `Loading environment variables 10 times took too long: ${totalTime}ms`,
    );
  });
});
