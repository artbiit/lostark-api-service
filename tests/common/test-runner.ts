/**
 * @cursor-change: 2025-01-27, v1.0.0, 테스트 실행 스크립트 표준화
 *
 * 테스트 실행을 표준화하는 스크립트
 * - 테스트 패턴별 실행
 * - 결과 보고
 * - 에러 처리
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../');

export interface TestOptions {
  pattern?: string;
  watch?: boolean;
  verbose?: boolean;
  timeout?: number;
}

export interface TestResult {
  success: boolean;
  code: number;
  output: string;
  error?: string;
}

/**
 * 테스트 실행
 */
export async function runTests(options: TestOptions = {}): Promise<TestResult> {
  const {
    pattern = 'tests/**/*.test.ts',
    watch = false,
    verbose = false,
    timeout = 300000, // 5분
  } = options;

  return new Promise((resolve, reject) => {
    const args = ['--test', pattern];

    if (watch) {
      args.push('--watch');
    }

    if (verbose) {
      args.push('--verbose');
    }

    console.log(`🚀 테스트 실행: ${pattern}`);
    console.log(`📁 작업 디렉토리: ${projectRoot}`);
    console.log(`⚙️  명령어: tsx ${args.join(' ')}`);

    const testProcess = spawn('tsx', args, {
      cwd: projectRoot,
      stdio: verbose ? 'inherit' : 'pipe',
      shell: true,
      timeout,
    });

    let output = '';
    let errorOutput = '';

    if (!verbose) {
      testProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      testProcess.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });
    }

    testProcess.on('close', (code) => {
      const result: TestResult = {
        success: code === 0,
        code: code || 0,
        output,
        error: errorOutput || undefined,
      };

      console.log('\n' + '='.repeat(60));
      if (result.success) {
        console.log('✅ 테스트 완료');
      } else {
        console.log(`❌ 테스트 실패 (종료 코드: ${code})`);
        if (errorOutput) {
          console.log('에러 출력:', errorOutput);
        }
      }

      resolve(result);
    });

    testProcess.on('error', (error) => {
      console.error('❌ 테스트 실행 중 오류:', error);
      reject(error);
    });

    testProcess.on('timeout', () => {
      console.error(`❌ 테스트 타임아웃 (${timeout}ms)`);
      testProcess.kill('SIGTERM');
      reject(new Error(`Test timeout after ${timeout}ms`));
    });
  });
}

/**
 * 단위 테스트 실행
 */
export async function runUnitTests(options: Omit<TestOptions, 'pattern'> = {}) {
  return runTests({
    ...options,
    pattern: 'tests/unit/**/*.test.ts',
  });
}

/**
 * 통합 테스트 실행
 */
export async function runIntegrationTests(options: Omit<TestOptions, 'pattern'> = {}) {
  return runTests({
    ...options,
    pattern: 'tests/integration/**/*.test.ts',
  });
}

/**
 * API 테스트 실행
 */
export async function runApiTests(options: Omit<TestOptions, 'pattern'> = {}) {
  return runTests({
    ...options,
    pattern: 'tests/integration/api/**/*.test.ts',
  });
}

/**
 * 전체 테스트 실행
 */
export async function runAllTests(options: Omit<TestOptions, 'pattern'> = {}) {
  console.log('🧪 전체 테스트 실행 시작');
  console.log('='.repeat(60));

  const results = await Promise.allSettled([
    runUnitTests(options),
    runIntegrationTests(options),
    runApiTests(options),
  ]);

  const summary = results.map((result, index) => {
    const testTypes = ['Unit', 'Integration', 'API'];
    const testType = testTypes[index];

    if (result.status === 'fulfilled') {
      return {
        type: testType,
        success: result.value.success,
        code: result.value.code,
      };
    } else {
      return {
        type: testType,
        success: false,
        code: -1,
        error: result.reason,
      };
    }
  });

  console.log('\n📊 테스트 결과 요약');
  console.log('='.repeat(60));

  let allSuccess = true;
  summary.forEach((result) => {
    const status = result.success ? '✅' : '❌';
    console.log(
      `${status} ${result.type} 테스트: ${result.success ? '성공' : '실패'} (코드: ${result.code})`,
    );
    if (!result.success) {
      allSuccess = false;
    }
  });

  console.log('\n' + '='.repeat(60));
  if (allSuccess) {
    console.log('🎉 모든 테스트가 성공했습니다!');
  } else {
    console.log('💥 일부 테스트가 실패했습니다.');
  }

  return {
    success: allSuccess,
    results: summary,
  };
}
