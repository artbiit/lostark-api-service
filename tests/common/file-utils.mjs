/**
 * @cursor-change: 2024-12-19, 1.0.0, 파일 유틸리티 공통 모듈
 *
 * 테스트 스크립트에서 공통으로 사용하는 파일 관련 유틸리티
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * 현재 파일의 디렉토리 경로 가져오기
 */
export function getCurrentDir(importMetaUrl) {
  const __filename = fileURLToPath(importMetaUrl);
  return path.dirname(__filename);
}

/**
 * 캐시 디렉토리 생성
 */
export async function ensureCacheDir(cachePath) {
  try {
    await fs.access(cachePath);
  } catch {
    await fs.mkdir(cachePath, { recursive: true });
    console.log(`📁 캐시 디렉토리 생성: ${cachePath}`);
  }
}

/**
 * 타임스탬프 생성
 */
export function createTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/**
 * JSON 파일 저장
 */
export async function saveJsonFile(filepath, data) {
  try {
    await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`💾 파일 저장: ${path.basename(filepath)}`);
    return true;
  } catch (error) {
    console.error(`❌ 파일 저장 실패: ${filepath}`, error.message);
    return false;
  }
}

/**
 * JSON 파일 읽기
 */
export async function loadJsonFile(filepath) {
  try {
    const content = await fs.readFile(filepath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ 파일 읽기 실패: ${filepath}`, error.message);
    return null;
  }
}

/**
 * 디렉토리에서 JSON 파일들 읽기
 */
export async function loadJsonFilesFromDir(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    const jsonFiles = files.filter((file) => file.endsWith('.json'));

    const data = [];

    for (const file of jsonFiles) {
      const filepath = path.join(dirPath, file);
      const content = await fs.readFile(filepath, 'utf8');
      const parsed = JSON.parse(content);

      data.push({
        filename: file,
        filepath,
        ...parsed,
      });
    }

    return data;
  } catch (error) {
    console.error('캐시 데이터 로드 실패:', error.message);
    return [];
  }
}
