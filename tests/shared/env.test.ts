/**
 * @cursor-change: 2024-12-19, 1.0.0, 환경변수 로딩 정규 테스트
 *
 * dotenv + zod를 통한 일관된 환경변수 로딩 테스트
 * - .env 파일 로딩 확인
 * - parseEnv() 함수 검증
 * - 환경변수 스키마 검증
 * - 기본값 적용 확인
 */

import { defaultConfig, envSchema, loadEnv, parseEnv } from '@lostark/shared/config/env.js';

describe('Environment Variables', () => {
  beforeAll(() => {
    // 테스트 시작 전 환경변수 로딩
    loadEnv();
  });

  describe('parseEnv()', () => {
    it('should load environment variables from .env file', () => {
      const env = parseEnv();

      expect(env).toBeDefined();
      expect(typeof env).toBe('object');
      expect(Object.keys(env).length).toBeGreaterThan(0);
    });

    it('should have required LOSTARK_API_KEY', () => {
      const env = parseEnv();

      expect(env.LOSTARK_API_KEY).toBeDefined();
      expect(env.LOSTARK_API_KEY.length).toBeGreaterThan(0);
    });

    it('should apply default values for missing variables', () => {
      const env = parseEnv();

      expect(env.NODE_ENV).toBe('development');
      expect(env.LOSTARK_API_VERSION).toBe('V9.0.0');
      expect(env.REST_API_PORT).toBe(3000);
      expect(env.UDP_GATEWAY_PORT).toBe(3001);
    });

    it('should validate environment variable types', () => {
      const env = parseEnv();

      // 숫자 타입 검증
      expect(typeof env.REST_API_PORT).toBe('number');
      expect(typeof env.UDP_GATEWAY_PORT).toBe('number');
      expect(typeof env.FETCH_RATE_LIMIT_PER_MINUTE).toBe('number');
      expect(typeof env.FETCH_RETRY_ATTEMPTS).toBe('number');

      // 문자열 타입 검증
      expect(typeof env.NODE_ENV).toBe('string');
      expect(typeof env.LOSTARK_API_KEY).toBe('string');
      expect(typeof env.LOSTARK_API_VERSION).toBe('string');

      // 불린 타입 검증
      expect(typeof env.LOG_PRETTY_PRINT).toBe('boolean');
    });
  });

  describe('envSchema', () => {
    it('should validate environment variables with zod schema', () => {
      const result = envSchema.safeParse(process.env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(Object.keys(result.data).length).toBeGreaterThan(0);
      }
    });

    it('should handle missing optional variables gracefully', () => {
      const testEnv = {
        ...process.env,
        CACHE_REDIS_URL: undefined,
        CACHE_REDIS_PASSWORD: undefined,
      };

      const result = envSchema.safeParse(testEnv);
      expect(result.success).toBe(true);
    });
  });

  describe('defaultConfig', () => {
    it('should have all required configuration keys', () => {
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
        expect(defaultConfig).toHaveProperty(key);
      });
    });

    it('should have sensible default values', () => {
      expect(defaultConfig.NODE_ENV).toBe('development');
      expect(defaultConfig.LOSTARK_API_VERSION).toBe('V9.0.0');
      expect(defaultConfig.REST_API_PORT).toBe(3000);
      expect(defaultConfig.UDP_GATEWAY_PORT).toBe(3001);
      expect(defaultConfig.FETCH_RATE_LIMIT_PER_MINUTE).toBe(100);
      expect(defaultConfig.FETCH_RETRY_ATTEMPTS).toBe(3);
      expect(defaultConfig.LOG_LEVEL).toBe('info');
    });
  });

  describe('Environment Variable Validation', () => {
    it('should validate port numbers are within valid range', () => {
      const env = parseEnv();

      expect(env.REST_API_PORT).toBeGreaterThan(0);
      expect(env.REST_API_PORT).toBeLessThanOrEqual(65535);
      expect(env.UDP_GATEWAY_PORT).toBeGreaterThan(0);
      expect(env.UDP_GATEWAY_PORT).toBeLessThanOrEqual(65535);
    });

    it('should validate rate limit values are reasonable', () => {
      const env = parseEnv();

      expect(env.FETCH_RATE_LIMIT_PER_MINUTE).toBeGreaterThan(0);
      expect(env.FETCH_RATE_LIMIT_PER_MINUTE).toBeLessThanOrEqual(1000);
      expect(env.FETCH_RETRY_ATTEMPTS).toBeGreaterThanOrEqual(0);
      expect(env.FETCH_RETRY_ATTEMPTS).toBeLessThanOrEqual(10);
    });

    it('should validate log level is valid', () => {
      const env = parseEnv();
      const validLogLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

      expect(validLogLevels).toContain(env.LOG_LEVEL);
    });
  });
});
