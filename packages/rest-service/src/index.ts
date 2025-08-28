/**
 * @cursor-change: 2025-01-27, v1.0.0, REST Service 메인 진입점
 *
 * REST Service 메인 모듈
 * - 서버 초기화 및 시작
 * - 프로세스 종료 처리
 * - 에러 핸들링
 * - dotenv를 통한 일관된 환경변수 로딩
 */

import { logger } from '@lostark/shared';
import { parseEnv } from '@lostark/shared/config/env';
import { restServer } from './server.js';

// === 환경변수 로딩 ===
// parseEnv() 함수가 자동으로 .env 파일을 로드합니다
const env = parseEnv();

// === 프로세스 종료 처리 ===

/**
 * 정상 종료 처리
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  try {
    await restServer.stop();
    logger.info('REST service stopped successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to stop REST service gracefully', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

/**
 * 비정상 종료 처리
 */
function handleUncaughtError(error: Error): void {
  logger.error('Uncaught error', {
    error: error.message,
    stack: error.stack,
  });

  // 서버 중지 시도
  restServer.stop().catch((stopError) => {
    logger.error('Failed to stop server during error handling', {
      error: stopError instanceof Error ? stopError.message : String(stopError),
    });
  });

  process.exit(1);
}

/**
 * 처리되지 않은 Promise 거부 처리
 */
function handleUnhandledRejection(reason: unknown, promise: Promise<unknown>): void {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    promise: promise.toString(),
  });

  // 서버 중지 시도
  restServer.stop().catch((stopError) => {
    logger.error('Failed to stop server during unhandled rejection', {
      error: stopError instanceof Error ? stopError.message : String(stopError),
    });
  });

  process.exit(1);
}

// === 메인 함수 ===

/**
 * REST Service 시작
 */
async function startRestService(): Promise<void> {
  try {
    logger.info('Starting REST service');

    // 서버 초기화
    await restServer.initialize();

    // 서버 시작
    await restServer.start();

    logger.info('REST service started successfully');
  } catch (error) {
    logger.error('Failed to start REST service', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// === 프로세스 이벤트 리스너 등록 ===

// 정상 종료 시그널
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 비정상 종료 처리
process.on('uncaughtException', handleUncaughtError);
process.on('unhandledRejection', handleUnhandledRejection);

// === 서비스 시작 ===

// 메인 함수 실행
startRestService().catch((error) => {
  logger.error('Failed to start REST service', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});

// === 모듈 export ===

export * from './server.js';
export { restServer };
