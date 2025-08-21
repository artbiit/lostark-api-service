/**
 * @cursor-change: 2024-12-19, 1.0.0, 환경변수 로드 공통 모듈
 *
 * 테스트 스크립트에서 공통으로 사용하는 환경변수 로드 기능
 */

import { readFileSync } from 'fs';
import path from 'path';

/**
 * .env 파일에서 환경변수 로드
 */
export function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf8');

    const envVars = {};
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key] = valueParts.join('=');
        }
      }
    });

    // 환경변수 설정
    Object.assign(process.env, envVars);
    console.log('✅ 환경변수 로드 완료');
  } catch (error) {
    console.warn('⚠️  .env 파일을 로드할 수 없습니다:', error.message);
  }
}

/**
 * API 키 가져오기
 */
export function getApiKey() {
  const apiKey = process.env.LOSTARK_API_KEY;
  if (!apiKey) {
    throw new Error('LOSTARK_API_KEY 환경변수가 설정되지 않았습니다');
  }
  return apiKey;
}

/**
 * 필수 환경변수 검증
 */
export function validateRequiredEnvVars() {
  const required = ['LOSTARK_API_KEY'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`필수 환경변수가 누락되었습니다: ${missing.join(', ')}`);
  }
}
