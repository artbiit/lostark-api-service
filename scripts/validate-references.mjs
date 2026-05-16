#!/usr/bin/env node

/**
 * @cursor-change: 2025-01-27, v1.0.0, TypeScript 프로젝트 참조 검증 스크립트
 *
 * tsconfig.json의 references 설정을 검증하여 올바른 의존성 참조를 보장
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGES_DIR = path.join(__dirname, '../packages');

/**
 * tsconfig.json 파일을 읽어서 설정을 검증
 */
async function validateTsConfig(packagePath, packageName) {
  const tsconfigPath = path.join(packagePath, 'tsconfig.json');

  try {
    const tsconfig = JSON.parse(await fs.readFile(tsconfigPath, 'utf-8'));
    const errors = [];

    // 1. extends 설정 확인
    if (!tsconfig.extends) {
      errors.push('extends 설정이 없습니다');
    } else if (!tsconfig.extends.includes('../../tsconfig.base.json')) {
      errors.push('tsconfig.base.json을 extends해야 합니다');
    }

    // 2. compilerOptions 확인
    const requiredOptions = ['outDir', 'rootDir', 'composite', 'types'];

    for (const option of requiredOptions) {
      if (!tsconfig.compilerOptions || !tsconfig.compilerOptions[option]) {
        errors.push(`compilerOptions.${option}이 설정되지 않았습니다`);
      }
    }

    // 3. rootDir 설정 확인
    if (tsconfig.compilerOptions?.rootDir !== './src') {
      errors.push('rootDir은 "./src"로 설정되어야 합니다');
    }

    // 4. include 설정 확인
    if (!tsconfig.include || !tsconfig.include.includes('src/**/*')) {
      errors.push('include에 "src/**/*"가 포함되어야 합니다');
    }

    // 5. references 설정 확인
    if (!tsconfig.references || !Array.isArray(tsconfig.references)) {
      // shared 패키지는 다른 패키지를 참조하지 않으므로 references가 없어도 됨
      if (packageName !== 'shared') {
        errors.push('references 배열이 설정되지 않았습니다');
      }
    } else {
      // shared 패키지는 다른 패키지를 참조하지 않아야 함
      if (packageName === 'shared' && tsconfig.references.length > 0) {
        errors.push('shared 패키지는 다른 패키지를 참조할 수 없습니다');
      }

      // 다른 패키지들의 경우
      if (packageName !== 'shared') {
        // shared 패키지는 모든 패키지에서 참조 가능
        const hasSharedRef = tsconfig.references.some((ref) => ref.path === '../shared');

        if (!hasSharedRef) {
          errors.push('shared 패키지 참조가 누락되었습니다');
        }

        // data-service는 rest-service, udp-service에서만 참조 가능
        const hasDataServiceRef = tsconfig.references.some((ref) => ref.path === '../data-service');

        if (['rest-service', 'udp-service'].includes(packageName)) {
          if (!hasDataServiceRef) {
            errors.push('data-service 패키지 참조가 누락되었습니다');
          }
        } else if (hasDataServiceRef) {
          errors.push('data-service 패키지 참조 권한이 없습니다');
        }
      }
    }

    return {
      packageName,
      errors,
      references: tsconfig.references || [],
    };
  } catch (error) {
    return {
      packageName,
      errors: [`tsconfig.json 읽기 실패: ${error.message}`],
      references: [],
    };
  }
}

/**
 * 모든 패키지의 tsconfig.json 검증
 */
async function validateAllReferences() {
  console.log('🔍 TypeScript 프로젝트 참조 검증 시작...\n');

  try {
    const packages = await fs.readdir(PACKAGES_DIR);
    const results = [];

    for (const pkg of packages) {
      const packagePath = path.join(PACKAGES_DIR, pkg);
      const stat = await fs.stat(packagePath);

      if (!stat.isDirectory()) continue;

      // package.json 부재 디렉토리는 graphify 캐시 등 산출물 폴더이므로 skip
      try {
        await fs.access(path.join(packagePath, 'package.json'));
      } catch {
        continue;
      }

      const result = await validateTsConfig(packagePath, pkg);
      results.push(result);
    }

    // 결과 출력
    let hasErrors = false;

    for (const result of results) {
      console.log(`📦 ${result.packageName}:`);

      if (result.errors.length === 0) {
        console.log('  ✅ 설정 정상');
        if (result.references.length > 0) {
          console.log(`  📋 참조: ${result.references.map((ref) => ref.path).join(', ')}`);
        } else {
          console.log('  📋 참조: (없음)');
        }
      } else {
        hasErrors = true;
        console.log('  ❌ 설정 오류:');
        result.errors.forEach((error) => {
          console.log(`    - ${error}`);
        });
      }
      console.log('');
    }

    if (hasErrors) {
      console.error('❌ TypeScript 프로젝트 참조 검증 실패');
      process.exit(1);
    } else {
      console.log('✅ 모든 TypeScript 프로젝트 참조가 유효합니다!');
    }
  } catch (error) {
    console.error('❌ 참조 검증 실패:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
validateAllReferences();
