/**
 * @cursor-change: 2025-01-27, v1.0.0, 테스트 공통 유틸리티 생성
 *
 * 테스트 환경 설정 및 공통 유틸리티 함수들
 * - 환경변수 로드
 * - 테스트 클라이언트 생성
 * - API 응답 모킹
 * - 테스트 데이터 관리
 */

import { parseEnv } from '@lostark/shared/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 테스트 환경 설정
 */
export function setupTestEnvironment() {
  try {
    const envPath = path.join(__dirname, '../../.env');
    return parseEnv(true, envPath);
  } catch (error) {
    console.warn('⚠️  .env 파일을 로드할 수 없습니다:', error);
    return parseEnv(false);
  }
}

/**
 * 테스트용 API 클라이언트 생성
 */
export function createTestClient() {
  const env = setupTestEnvironment();

  return {
    apiKey: env.LOSTARK_API_KEY,
    baseUrl: 'https://developer-lostark.game.onstove.com',
    version: env.LOSTARK_API_VERSION,
  };
}

/**
 * 테스트용 캐릭터 목록 가져오기
 */
export function getTestCharacters() {
  return ['테스트캐릭터1', '테스트캐릭터2'];
}

/**
 * 테스트용 API 응답 모킹
 */
export function mockApiResponse(data: any, status = 200) {
  return {
    status,
    data,
    headers: {
      'content-type': 'application/json',
    },
  };
}

/**
 * 테스트용 에러 응답 모킹
 */
export function mockApiError(status: number, message: string) {
  return {
    status,
    error: {
      message,
      code: status,
    },
  };
}

/**
 * 테스트 데이터 저장
 */
export async function saveTestData(filename: string, data: any) {
  const fs = await import('fs/promises');
  const testDataPath = path.join(__dirname, '../fixtures', filename);

  try {
    await fs.mkdir(path.dirname(testDataPath), { recursive: true });
    await fs.writeFile(testDataPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.warn('⚠️  테스트 데이터 저장 실패:', error);
  }
}

/**
 * 테스트 데이터 로드
 */
export async function loadTestData(filename: string) {
  const fs = await import('fs/promises');
  const testDataPath = path.join(__dirname, '../fixtures', filename);

  try {
    const data = await fs.readFile(testDataPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('⚠️  테스트 데이터 로드 실패:', error);
    return null;
  }
}

/**
 * 테스트 타임아웃 설정
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Test timeout after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

/**
 * 테스트 환경 검증
 */
export function validateTestEnvironment() {
  const env = setupTestEnvironment();

  if (!env.LOSTARK_API_KEY) {
    throw new Error('LOSTARK_API_KEY 환경변수가 설정되지 않았습니다');
  }

  return env;
}
