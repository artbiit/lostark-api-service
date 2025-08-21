/**
 * @cursor-change: 2024-12-19, 1.0.0, 로깅 설정 및 로거 생성
 *
 * pino 기반 구조화 로깅 설정
 * - JSON 구조 로그
 * - requestId 포함
 * - 환경별 설정 분리
 */

import { pino } from 'pino';

import { parseEnv } from './env.js';

// === 로거 설정 ===

export function createLogger(name: string, requestId?: string): pino.Logger {
  const config = parseEnv();

  const baseConfig: pino.LoggerOptions = {
    name,
    level: config.LOG_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
      log: (object) => {
        // 민감한 정보 필터링
        const { password, apiKey, token, ...safeObject } = object;
        return safeObject;
      },
    },
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err,
    },
  };

  // 개발 환경에서는 pretty print
  if (config.LOG_PRETTY_PRINT || config.NODE_ENV === 'development') {
    return pino({
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  return pino(baseConfig);
}

// === requestId 생성 ===

export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// === 로거 인스턴스 ===

export const logger = createLogger('lostark-api-service');

// === 로깅 헬퍼 ===

export function logApiCall(
  logger: pino.Logger,
  method: string,
  url: string,
  statusCode: number,
  duration: number,
  requestId?: string,
): void {
  logger.info({
    type: 'api_call',
    method,
    url,
    statusCode,
    duration,
    requestId,
  });
}

export function logError(
  logger: pino.Logger,
  error: Error,
  context?: Record<string, unknown>,
  requestId?: string,
): void {
  logger.error({
    type: 'error',
    message: error.message,
    stack: error.stack,
    context,
    requestId,
  });
}

export function logCacheHit(
  logger: pino.Logger,
  key: string,
  ttl: number,
  requestId?: string,
): void {
  logger.debug({
    type: 'cache_hit',
    key,
    ttl,
    requestId,
  });
}

export function logCacheMiss(logger: pino.Logger, key: string, requestId?: string): void {
  logger.debug({
    type: 'cache_miss',
    key,
    requestId,
  });
}
