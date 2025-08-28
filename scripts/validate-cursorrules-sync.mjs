#!/usr/bin/env node

/**
 * 커서룰 동기화 검증 스크립트
 * 
 * .cursorrules의 영어 키워드와 Docs/cursorrules/의 한국어 번역 문서 간
 * 동기화 상태를 검증합니다.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';

// ANSI 색상 코드
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * .cursorrules에서 영어 키워드 추출
 */
function extractEnglishKeywords(content) {
  const keywords = content.match(/\[([A-Z_]+)\]/g) || [];
  return keywords.map(k => k.slice(1, -1));
}

/**
 * 재귀적으로 .md 파일 찾기
 */
function findMdFiles(dir) {
  const files = [];
  
  try {
    const items = readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        files.push(...findMdFiles(fullPath));
      } else if (item.isFile() && item.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    logWarning(`디렉토리 읽기 실패: ${dir}`);
  }
  
  return files;
}

/**
 * 한국어 문서에서 해당 키워드 검색
 */
function validateTranslation(keywords, docsPath) {
  const docFiles = findMdFiles(docsPath);
  const missingTranslations = [];
  const foundKeywords = new Set();
  
  logInfo(`검색 대상 문서: ${docFiles.length}개`);
  
  for (const keyword of keywords) {
    let found = false;
    
    for (const file of docFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        if (content.includes(keyword)) {
          found = true;
          foundKeywords.add(keyword);
          break;
        }
      } catch (error) {
        logWarning(`파일 읽기 실패: ${file}`);
      }
    }
    
    if (!found) {
      missingTranslations.push(keyword);
    }
  }
  
  return {
    missing: missingTranslations,
    found: Array.from(foundKeywords),
    total: keywords.length
  };
}

/**
 * 한국어 문서에서 영어 키워드 사용 현황 분석
 */
function analyzeKeywordUsage(keywords, docsPath) {
  const docFiles = findMdFiles(docsPath);
  const usage = {};
  
  for (const keyword of keywords) {
    usage[keyword] = [];
    
    for (const file of docFiles) {
      try {
        const content = readFileSync(file, 'utf8');
        if (content.includes(keyword)) {
          const relativePath = path.relative(process.cwd(), file);
          usage[keyword].push(relativePath);
        }
      } catch (error) {
        logWarning(`파일 읽기 실패: ${file}`);
      }
    }
  }
  
  return usage;
}

/**
 * 메인 검증 로직
 */
function main() {
  log('🔍 커서룰 동기화 검증 시작...', 'cyan');
  
  // .cursorrules 파일 읽기
  const cursorRulesPath = '.cursorrules';
  const docsPath = 'Docs/cursorrules';
  
  if (!existsSync(cursorRulesPath)) {
    logError('.cursorrules 파일을 찾을 수 없습니다.');
    process.exit(1);
  }
  
  if (!existsSync(docsPath)) {
    logError('Docs/cursorrules 디렉토리를 찾을 수 없습니다.');
    process.exit(1);
  }
  
  try {
    const cursorRules = readFileSync(cursorRulesPath, 'utf8');
    const keywords = extractEnglishKeywords(cursorRules);
    
    logInfo(`발견된 영어 키워드: ${keywords.length}개`);
    
    // 번역 검증
    const validation = validateTranslation(keywords, docsPath);
    const usage = analyzeKeywordUsage(keywords, docsPath);
    
    // 결과 출력
    console.log('\n📊 검증 결과:');
    console.log('='.repeat(50));
    
    if (validation.missing.length === 0) {
      logSuccess(`모든 키워드(${validation.total}개)가 한국어 문서에 번역되어 있습니다.`);
    } else {
      logError(`${validation.missing.length}개의 키워드가 한국어 문서에 번역되지 않았습니다:`);
      validation.missing.forEach(keyword => {
        logError(`  - ${keyword}`);
      });
    }
    
    // 키워드 사용 현황 출력
    console.log('\n📋 키워드 사용 현황:');
    console.log('-'.repeat(30));
    
    for (const [keyword, files] of Object.entries(usage)) {
      if (files.length > 0) {
        logSuccess(`${keyword}: ${files.length}개 문서에서 사용`);
        files.forEach(file => {
          logInfo(`  - ${file}`);
        });
      } else {
        logWarning(`${keyword}: 번역 문서에서 찾을 수 없음`);
      }
    }
    
    // 종료 코드 결정
    if (validation.missing.length > 0) {
      console.log('\n💡 해결 방법:');
      console.log('1. 누락된 키워드를 한국어 문서에 추가하세요.');
      console.log('2. 키워드 형식: [KEYWORD_NAME]');
      console.log('3. 다시 검증을 실행하세요.');
      
      process.exit(1);
    } else {
      logSuccess('커서룰 동기화 검증 완료!');
      process.exit(0);
    }
    
  } catch (error) {
    logError(`검증 중 오류 발생: ${error.message}`);
    process.exit(1);
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
