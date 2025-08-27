/**
 * @cursor-change: 2025-01-27, v1.4.0, 패키지 기반 테스트 실행 스크립트
 *
 * 패키지 기반 캐시 플로우 테스트 실행
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../');

console.log('🚀 패키지 기반 캐시 플로우 테스트 실행');
console.log('='.repeat(60));

// TypeScript 테스트 실행
const testProcess = spawn('yarn', ['test:cache-flow'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
});

testProcess.on('close', (code) => {
  console.log('\n' + '='.repeat(60));
  if (code === 0) {
    console.log('✅ 패키지 기반 테스트 완료');
  } else {
    console.log(`❌ 패키지 기반 테스트 실패 (종료 코드: ${code})`);
  }
});

testProcess.on('error', (error) => {
  console.error('❌ 테스트 실행 중 오류:', error.message);
  process.exit(1);
});
