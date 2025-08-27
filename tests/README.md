# Tests Directory

<!-- @cursor-change: 2025-01-27, v1.0.1, 문서 최신화 규칙 적용 -->

이 디렉토리는 Lost Ark API 서비스의 테스트 및 데이터 수집 도구들을 포함합니다.

## 📁 디렉토리 구조

```
tests/
├── api/                          # API 테스트
│   ├── lostark-api/
│   │   └── V9.0.0/              # Lost Ark API v9.0.0 테스트
│   ├── cache-flow-test.mjs      # 전체 API 캐시 플로우 테스트 (레거시)
│   ├── simple-cache-flow-test.mjs # ARMORIES API 캐시 플로우 테스트 (레거시)
│   ├── all-apis-cache-flow-test.mjs # 모든 API 캐시 플로우 테스트 (레거시)
│   ├── package-based-cache-flow-test.ts # 패키지 기반 캐시 플로우 테스트 (새로운)
│   └── run-package-test.mjs     # 패키지 기반 테스트 실행 스크립트
├── character-data/               # 캐릭터 데이터 수집/분석
│   ├── collector/               # 데이터 수집기
│   ├── analyzer/                # 데이터 분석기
│   └── run-character-analysis.mjs  # 통합 실행 스크립트
├── common/                      # 공통 모듈
│   ├── env-loader.mjs          # 환경변수 로드
│   ├── file-utils.mjs          # 파일 유틸리티
│   ├── streamer-list.mjs       # 스트리머 목록
│   ├── api-client.mjs          # API 클라이언트
│   └── cache-flow-client.mjs   # 캐시 플로우 테스트용 클라이언트
├── shared/                      # 공유 테스트
└── README.md                    # 이 파일
```

## 🚀 사용법

### 캐릭터 데이터 수집 및 분석

```bash
# 전체 프로세스 실행 (수집 + 분석)
node tests/character-data/run-character-analysis.mjs

# 개별 실행
node tests/character-data/collector/character-data-collector.mjs
node tests/character-data/analyzer/character-data-analyzer.mjs
```

### API 테스트

```bash
# Lost Ark API 테스트
node tests/api/lostark-api/V9.0.0/api.test.mjs
node tests/api/lostark-api/V9.0.0/siblings.test.mjs

# 캐시 플로우 테스트 (패키지 기반 - 권장)
yarn test:cache-flow                                    # 패키지 기반 테스트 실행
node tests/api/run-package-test.mjs                    # 실행 스크립트 사용

# 캐시 플로우 테스트 (레거시 mjs 파일)
node tests/api/simple-cache-flow-test.mjs              # ARMORIES API만 테스트
node tests/api/all-apis-cache-flow-test.mjs            # 모든 API 테스트
```

## 📊 데이터 수집

### 캐릭터 데이터 수집기

스트리머들의 캐릭터 정보를 수집하는 도구입니다.

**기능:**

- 스트리머 목록 기반 대표 캐릭터 정보 수집
- 형제 캐릭터 목록 수집
- API 응답 전체(성공/실패 포함) 캐싱
- 수집 결과 요약 저장

**출력:**

- `cache/character-data/character-{캐릭터명}-{타임스탬프}.json`
- `cache/character-data/collection-summary-{타임스탬프}.json`

### 캐릭터 데이터 분석기

수집된 캐릭터 데이터를 분석하는 도구입니다.

**기능:**

- 스트리머별 캐릭터 통계 분석
- 클래스별 통계 분석
- API 응답 품질 분석
- 상세 분석 결과 저장

**출력:**

- `cache/character-data/analysis-{타임스탬프}.json`

## 🔧 공통 모듈

### env-loader.mjs

환경변수 로드 및 검증 기능

```javascript
import {
  loadEnv,
  getApiKey,
  validateRequiredEnvVars,
} from './common/env-loader.mjs';

loadEnv();
validateRequiredEnvVars();
const apiKey = getApiKey();
```

### file-utils.mjs

파일 관련 유틸리티

```javascript
import {
  getCurrentDir,
  ensureCacheDir,
  createTimestamp,
  saveJsonFile,
  loadJsonFile,
  loadJsonFilesFromDir,
} from './common/file-utils.mjs';

const __dirname = getCurrentDir(import.meta.url);
await ensureCacheDir(cachePath);
const timestamp = createTimestamp();
await saveJsonFile(filepath, data);
```

### streamer-list.mjs

스트리머 목록 관리

```javascript
import {
  STREAMERS,
  getCharacterByStreamer,
  getStreamerByCharacter,
  getAllStreamerNames,
  getAllCharacterNames,
} from './common/streamer-list.mjs';
```

### api-client.mjs

Lost Ark API 클라이언트

```javascript
import {
  getCharacterInfo,
  getCharacterSiblings,
  searchAuctionItems,
  searchMarketItems,
} from './common/api-client.mjs';

const characterData = await getCharacterInfo('캐릭터명');
const siblingsData = await getCharacterSiblings('캐릭터명');
```

### cache-flow-client.mjs

캐시 플로우 테스트용 API 클라이언트

```javascript
import { createCacheFlowClient } from './common/cache-flow-client.mjs';

const apiClient = createCacheFlowClient();
const result = await apiClient.armories.getCharacterDetail('캐릭터명');
```

## 📦 패키지 기반 테스트

### package-based-cache-flow-test.ts

실제 패키지의 클라이언트를 사용하는 새로운 TypeScript 테스트입니다.

**특징:**

- **실제 패키지 사용**: `@lostark/data-service`의 실제 클라이언트 사용
- **TypeScript 기반**: 타입 안전성과 IDE 지원 향상
- **Armories API 특수성 반영**: 전체 API + 개별 섹션 테스트
- **API 목록 검증**: 공식 문서와 비교하여 누락된 API 확인
- **더 정확한 테스트**: 실제 서비스 로직과 동일한 환경에서 테스트

**테스트 대상 API:**

1. **ARMORIES API**: 메인 API (383KB) + 9개 개별 섹션
2. **AUCTIONS API**: 옵션 조회
3. **NEWS API**: 공지사항 목록
4. **GAMECONTENTS API**: 주간 콘텐츠 달력
5. **MARKETS API**: 옵션 조회 + 아이템 ID 조회

**실행 방법:**

```bash
# 권장 방법
yarn test:cache-flow

# 또는 실행 스크립트 사용
node tests/api/run-package-test.mjs
```

**API 목록 검증 결과:**

- ✅ **구현된 API**: NEWS, CHARACTERS, ARMORIES, AUCTIONS, MARKETS, GAMECONTENTS
- ❌ **누락된 API**: GUILDS (deprecated, 302 리다이렉트로 사용 불가)

## 📋 스트리머 목록

현재 수집 대상 스트리머들:

| 스트리머     | 대표 캐릭터  |
| ------------ | ------------ |
| 이다         | 이다         |
| 쫀지         | 쫀지         |
| 노돌리       | 노돌리       |
| 박서림       | 박서림       |
| 로마러       | 로마러       |
| 성대         | 성대         |
| 짱여니       | 짱여니       |
| 선짱         | 선짱         |
| 도읍지       | 도읍지       |
| 게임하는인기 | 게임하는인기 |
| 신선한망치   | 신선한망치   |
| 새미네집     | 디아스페로   |
| 숫여우       | 수채화여우   |
| 리연         | 특치달소     |

## 🔍 분석 결과 예시

### 스트리머별 통계

```json
{
  "streamer": "이다",
  "characters": [
    {
      "name": "이다",
      "level": 60,
      "class": "버서커",
      "itemLevel": 1620.5,
      "server": "아브렐슈드",
      "type": "main"
    }
  ],
  "totalCharacters": 1,
  "apiSuccess": 2,
  "apiFailed": 0
}
```

### 클래스별 통계

```json
{
  "class": "버서커",
  "count": 5,
  "streamers": ["이다", "쫀지", "노돌리"],
  "avgLevel": 59.8,
  "avgItemLevel": 1615.2
}
```

### API 품질

```json
{
  "totalRequests": 28,
  "successfulRequests": 26,
  "failedRequests": 2,
  "successRate": "92.9"
}
```

## ⚠️ 주의사항

1. **API 키 필요**: `.env` 파일에 `LOSTARK_API_KEY` 설정 필요
2. **레이트 리밋**: API 호출 간격 조절 (1초 대기)
3. **캐시 디렉토리**: `cache/character-data/` 자동 생성
4. **스트리머 목록**: `common/streamer-list.mjs`에서 관리

## 🔄 업데이트 이력

- **2025-01-27**: 캐시 플로우 테스트 추가, 3계층 캐시 시스템 검증 도구 구현
- **2024-12-19**: 디렉토리 구조 정리, 공통 모듈 분리, 캐릭터 데이터 수집/분석
  도구 개선
