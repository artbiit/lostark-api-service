/**
 * @cursor-change: 2025-01-27, v1.0.0, 테스트 실행 메인 스크립트
 *
 * 테스트 실행을 위한 메인 스크립트
 * - 단위 테스트
 * - 통합 테스트
 * - 전체 테스트
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../');

const args = process.argv.slice(2);
const testType = args[0] || 'all';

console.log('🧪 Lost Ark API Service 테스트 실행');
console.log('='.repeat(60));

let command;
let description;

switch (testType) {
  case 'unit':
    command = 'yarn test:unit';
    description = '단위 테스트';
    break;
  case 'integration':
    command = 'yarn test:integration';
    description = '통합 테스트';
    break;
  case 'api':
    command = 'yarn test:api';
    description = 'API 테스트';
    break;
  case 'cache-flow':
    command = 'yarn test:cache-flow';
    description = '캐시 플로우 테스트';
    break;
  case 'workspace':
    command = 'yarn test:workspace';
    description = '워크스페이스 테스트';
    break;
  case 'all':
  default:
    command = 'yarn test';
    description = '전체 테스트';
    break;
}

console.log(`📋 실행 유형: ${description}`);
console.log(`⚙️  명령어: ${command}`);
console.log(`📁 작업 디렉토리: ${projectRoot}`);
console.log('='.repeat(60));

const testProcess = spawn(command, [], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
});

testProcess.on('close', (code) => {
  console.log('\n' + '='.repeat(60));
  if (code === 0) {
    console.log('✅ 테스트 완료');
  } else {
    console.log(`❌ 테스트 실패 (종료 코드: ${code})`);
    process.exit(code);
  }
});

testProcess.on('error', (error) => {
  console.error('❌ 테스트 실행 중 오류:', error);
  process.exit(1);
});
