/**
 * @cursor-change: 2024-12-19, 1.0.0, 환경변수 스키마 및 기본 설정 정의
 *
 * 환경변수 스키마 정의 및 기본 설정값 관리
 * - Lost Ark API 키 및 엔드포인트
 * - 각 계층별 설정값
 * - 환경별 설정 분리
 * - dotenv를 통한 일관된 환경변수 로딩
 */

import { join } from 'path';

import dotenv from 'dotenv';
import { z } from 'zod';

// === 환경변수 스키마 정의 ===

export const envSchema = z.object({
  // === 환경 설정 ===
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),

  // === Lost Ark API 설정 ===
  LOSTARK_API_KEY: z.string().min(1, 'Lost Ark API 키는 필수입니다'),
  LOSTARK_API_VERSION: z.string().default('V9.0.0'),

  // === Fetch Layer 설정 ===
  FETCH_RATE_LIMIT_PER_MINUTE: z.coerce.number().min(1).default(100),
  FETCH_RETRY_ATTEMPTS: z.coerce.number().min(0).max(5).default(3),
  FETCH_RETRY_DELAY_MS: z.coerce.number().min(100).default(1000),
  FETCH_CIRCUIT_BREAKER_THRESHOLD: z.coerce.number().min(1).default(5),
  FETCH_CIRCUIT_BREAKER_TIMEOUT_MS: z.coerce.number().min(1000).default(30000),

  // === REST API 설정 ===
  REST_API_PORT: z.coerce.number().min(1).max(65535).default(3000),
  REST_API_HOST: z.string().default('0.0.0.0'),
  REST_API_CORS_ORIGIN: z.string().default('*'),
  REST_API_RATE_LIMIT_PER_MINUTE: z.coerce.number().min(1).default(100),

  // === REST Server ===
  REST_SERVER_PORT: z.coerce.number().min(1).max(65535).default(3000),
  REST_SERVER_HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_MAX: z.coerce.number().min(1).default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().min(1000).default(60000),

  // === UDP Gateway 설정 ===
  UDP_GATEWAY_PORT: z.coerce.number().min(1).max(65535).default(3001),
  UDP_GATEWAY_HOST: z.string().default('0.0.0.0'),
  UDP_GATEWAY_MAX_MESSAGE_SIZE: z.coerce.number().min(1024).default(8192),
  UDP_GATEWAY_WORKER_POOL_SIZE: z.coerce.number().min(1).default(4),

  // === 캐시 설정 ===
  CACHE_REDIS_URL: z.string().url().optional(),
  CACHE_REDIS_PASSWORD: z.string().optional(),
  CACHE_REDIS_DB: z.coerce.number().min(0).max(15).default(0),
  CACHE_MEMORY_TTL_SECONDS: z.coerce.number().min(1).default(300), // 5분
  CACHE_REDIS_TTL_SECONDS: z.coerce.number().min(1).default(1800), // 30분

  // === 로깅 설정 ===
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_PRETTY_PRINT: z.coerce.boolean().default(false),

  // === 데이터베이스 설정 ===
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().min(1).max(65535).default(3306),
  DB_USERNAME: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_DATABASE: z.string().default('lostark'),
  DB_CONNECTION_LIMIT: z.coerce.number().min(1).default(10),
});

// === 환경변수 로딩 ===

/**
 * .env 파일에서 환경변수 로드
 * @param envPath .env 파일 경로 (기본값: 현재 디렉토리의 .env)
 */
export function loadEnv(envPath?: string): void {
  try {
    const path = envPath || join(process.cwd(), '.env');
    const result = dotenv.config({ path });

    if (result.error) {
      console.warn(`⚠️  .env 파일 로딩 실패: ${result.error.message}`);
      console.warn('💡 기본값을 사용합니다.');
    } else {
      console.log(`✅ .env 파일 로딩 성공: ${path}`);
    }
  } catch (error) {
    console.warn(
      `⚠️  .env 파일 로딩 중 오류: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.warn('💡 기본값을 사용합니다.');
  }
}

// === 환경변수 파싱 및 검증 ===

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * 환경변수 파싱 및 검증
 * @param autoLoad .env 파일 자동 로드 여부 (기본값: true)
 * @param envPath .env 파일 경로
 */
export function parseEnv(autoLoad: boolean = true, envPath?: string): EnvConfig {
  // .env 파일 자동 로드
  if (autoLoad) {
    loadEnv(envPath);
  }

  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ 환경변수 검증 실패:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

// === 기본 설정값 ===

export const defaultConfig: EnvConfig = {
  NODE_ENV: 'development',
  LOSTARK_API_KEY: '',
  LOSTARK_API_VERSION: 'V9.0.0',
  FETCH_RATE_LIMIT_PER_MINUTE: 100,
  FETCH_RETRY_ATTEMPTS: 3,
  FETCH_RETRY_DELAY_MS: 1000,
  FETCH_CIRCUIT_BREAKER_THRESHOLD: 5,
  FETCH_CIRCUIT_BREAKER_TIMEOUT_MS: 30000,
  REST_API_PORT: 3000,
  REST_API_HOST: '0.0.0.0',
  REST_API_CORS_ORIGIN: '*',
  REST_API_RATE_LIMIT_PER_MINUTE: 100,
  REST_SERVER_PORT: 3000,
  REST_SERVER_HOST: '0.0.0.0',
  CORS_ORIGIN: '*',
  RATE_LIMIT_MAX: 100,
  RATE_LIMIT_WINDOW: 60000,
  UDP_GATEWAY_PORT: 3001,
  UDP_GATEWAY_HOST: '0.0.0.0',
  UDP_GATEWAY_MAX_MESSAGE_SIZE: 8192,
  UDP_GATEWAY_WORKER_POOL_SIZE: 4,
  CACHE_REDIS_URL: undefined,
  CACHE_REDIS_PASSWORD: undefined,
  CACHE_REDIS_DB: 0,
  CACHE_MEMORY_TTL_SECONDS: 300,
  CACHE_REDIS_TTL_SECONDS: 1800,
  LOG_LEVEL: 'info',
  LOG_PRETTY_PRINT: false,
  DB_HOST: 'localhost',
  DB_PORT: 3306,
  DB_USERNAME: 'root',
  DB_PASSWORD: '',
  DB_DATABASE: 'lostark',
  DB_CONNECTION_LIMIT: 10,
};

// === 환경별 설정 헬퍼 ===

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isStaging(): boolean {
  return process.env.NODE_ENV === 'staging';
}

// === 설정 검증 헬퍼 ===

export function validateApiKey(): void {
  const config = parseEnv();
  if (!config.LOSTARK_API_KEY) {
    throw new Error('LOSTARK_API_KEY 환경변수가 설정되지 않았습니다');
  }
}

export function validateRedisConfig(): boolean {
  const config = parseEnv();
  return !!config.CACHE_REDIS_URL;
}
