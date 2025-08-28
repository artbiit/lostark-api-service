#!/usr/bin/env node

/**
 * @cursor-change: 2025-01-27, v1.0.0, 모노레포 의존성 검증 스크립트
 *
 * 패키지 간 의존성 관계를 검증하여 순환 참조나 잘못된 참조를 방지
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGES_DIR = path.join(__dirname, '../packages');

/**
 * 패키지의 package.json을 읽어서 의존성 정보를 추출
 */
async function getPackageDependencies(packagePath) {
  try {
    const packageJsonPath = path.join(packagePath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    return {
      name: packageJson.name,
      dependencies: packageJson.dependencies || {},
      devDependencies: packageJson.devDependencies || {},
      peerDependencies: packageJson.peerDependencies || {},
    };
  } catch (error) {
    console.error(`❌ 패키지 읽기 실패: ${packagePath}`, error.message);
    return null;
  }
}

/**
 * tsconfig.json의 references를 읽어서 프로젝트 참조 정보를 추출
 */
async function getProjectReferences(packagePath) {
  try {
    const tsconfigPath = path.join(packagePath, 'tsconfig.json');
    const tsconfig = JSON.parse(await fs.readFile(tsconfigPath, 'utf-8'));

    return {
      references: tsconfig.references || [],
      include: tsconfig.include || [],
      exclude: tsconfig.exclude || [],
    };
  } catch (error) {
    console.error(`❌ tsconfig.json 읽기 실패: ${packagePath}`, error.message);
    return null;
  }
}

/**
 * 순환 참조 검사
 */
function detectCircularDependencies(dependencies) {
  const visited = new Set();
  const recursionStack = new Set();
  const cycles = [];

  function dfs(packageName, path = []) {
    if (recursionStack.has(packageName)) {
      const cycle = [...path.slice(path.indexOf(packageName)), packageName];
      cycles.push(cycle);
      return;
    }

    if (visited.has(packageName)) {
      return;
    }

    visited.add(packageName);
    recursionStack.add(packageName);

    const deps = dependencies[packageName] || [];
    for (const dep of deps) {
      dfs(dep, [...path, packageName]);
    }

    recursionStack.delete(packageName);
  }

  for (const packageName of Object.keys(dependencies)) {
    if (!visited.has(packageName)) {
      dfs(packageName);
    }
  }

  return cycles;
}

/**
 * 잘못된 참조 검사
 */
function validateReferences(packages, references) {
  const errors = [];

  for (const [packageName, refs] of Object.entries(references)) {
    for (const ref of refs) {
      // ref가 문자열인 경우 (path 속성이 없는 경우)
      const refPath = typeof ref === 'string' ? ref : ref.path;

      if (!refPath) {
        errors.push(`❌ ${packageName}: 잘못된 참조 형식 - ${JSON.stringify(ref)}`);
        continue;
      }

      const targetPackage = path.basename(refPath);

      // 참조 대상 패키지가 존재하는지 확인
      if (!packages.includes(targetPackage)) {
        errors.push(`❌ ${packageName}: 존재하지 않는 패키지 참조 - ${targetPackage}`);
      }

      // shared 패키지는 모든 패키지에서 참조 가능
      if (targetPackage === 'shared') {
        continue;
      }

      // data-service는 rest-service, udp-service에서만 참조 가능
      if (targetPackage === 'data-service') {
        if (!['rest-service', 'udp-service'].includes(packageName)) {
          errors.push(`❌ ${packageName}: data-service 참조 권한 없음`);
        }
      }
    }
  }

  return errors;
}

/**
 * 메인 검증 함수
 */
async function validateDependencies() {
  console.log('🔍 모노레포 의존성 검증 시작...\n');

  try {
    // 1. 패키지 목록 가져오기
    const packages = await fs.readdir(PACKAGES_DIR);
    const validPackages = [];

    for (const pkg of packages) {
      const packagePath = path.join(PACKAGES_DIR, pkg);
      const stat = await fs.stat(packagePath);
      if (stat.isDirectory()) {
        validPackages.push(pkg);
      }
    }

    console.log(`📦 발견된 패키지: ${validPackages.join(', ')}\n`);

    // 2. 각 패키지의 의존성 정보 수집
    const dependencies = {};
    const references = {};
    const packageInfos = {};

    for (const pkg of validPackages) {
      const packagePath = path.join(PACKAGES_DIR, pkg);
      const packageInfo = await getPackageDependencies(packagePath);
      const refInfo = await getProjectReferences(packagePath);

      if (packageInfo) {
        packageInfos[pkg] = packageInfo;

        // workspace 의존성만 추출
        const workspaceDeps = Object.keys(packageInfo.dependencies)
          .filter((dep) => dep.startsWith('@lostark/'))
          .map((dep) => dep.replace('@lostark/', ''));

        dependencies[pkg] = workspaceDeps;
      }

      if (refInfo) {
        references[pkg] = refInfo.references.map((ref) => ref.path);
      }
    }

    // 3. 순환 참조 검사
    console.log('🔄 순환 참조 검사...');
    const cycles = detectCircularDependencies(dependencies);

    if (cycles.length > 0) {
      console.error('❌ 순환 참조 발견:');
      cycles.forEach((cycle, index) => {
        console.error(`  ${index + 1}. ${cycle.join(' → ')}`);
      });
      process.exit(1);
    } else {
      console.log('✅ 순환 참조 없음\n');
    }

    // 4. 프로젝트 참조 검사
    console.log('📋 프로젝트 참조 검사...');
    const refErrors = validateReferences(validPackages, references);

    if (refErrors.length > 0) {
      console.error('❌ 잘못된 참조 발견:');
      refErrors.forEach((error) => console.error(`  ${error}`));
      process.exit(1);
    } else {
      console.log('✅ 모든 참조가 유효함\n');
    }

    // 5. 의존성 관계 출력
    console.log('📊 의존성 관계:');
    for (const [pkg, deps] of Object.entries(dependencies)) {
      if (deps.length > 0) {
        console.log(`  ${pkg} → [${deps.join(', ')}]`);
      } else {
        console.log(`  ${pkg} → (의존성 없음)`);
      }
    }

    console.log('\n✅ 모노레포 의존성 검증 완료!');
  } catch (error) {
    console.error('❌ 의존성 검증 실패:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
validateDependencies();
