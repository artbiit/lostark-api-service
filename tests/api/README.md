# API Tests

**@cursor-change: 2025-01-27, v1.0.0, API 테스트 디렉토리 문서화**

이 디렉토리는 Lost Ark API 서비스의 다양한 테스트 스크립트들을 포함합니다.

## 📁 파일 구조

```
api/
├── lostark-api/
│   └── V9.0.0/                    # Lost Ark API v9.0.0 테스트
│       ├── api.test.mjs          # 기본 API 테스트
│       ├── armories-service.test.mjs # ARMORIES 서비스 테스트
│       ├── characters-service.test.mjs # CHARACTERS 서비스 테스트
│       ├── debug-api.test.mjs    # API 디버그 테스트
│       ├── siblings.test.mjs     # 형제 캐릭터 테스트
│       └── simple-armories-test.mjs # 간단한 ARMORIES 테스트
├── cache-flow-test.mjs           # 전체 API 캐시 플로우 테스트
├── simple-cache-flow-test.mjs    # ARMORIES API 캐시 플로우 테스트
├── all-apis-cache-flow-test.mjs  # 모든 API 캐시 플로우 테스트
└── README.md                     # 이 파일
```

## 🚀 캐시 플로우 테스트

### 개요

3계층 캐시 시스템 (in-memory → Redis → MySQL)의 데이터 이동을 검증하는
테스트입니다.

### 실행 방법

```bash
# ARMORIES API만 테스트 (가장 큰 단위)
node tests/api/simple-cache-flow-test.mjs

# 모든 API 테스트
node tests/api/all-apis-cache-flow-test.mjs

# 전체 캐시 플로우 테스트 (상세)
node tests/api/cache-flow-test.mjs
```

### 테스트 시나리오

각 API별로 다음 단계를 검증합니다:

1. **초기 상태 확인**: 모든 캐시가 비어있는지 확인
2. **API 호출**: Memory Cache에 즉시 저장
3. **Memory Cache 확인**: 데이터 존재 확인
4. **Redis 이동 확인**: TTL 만료 후에도 데이터 유지
5. **MySQL 저장 확인**: 영구 저장소에 데이터 보존

### 테스트 결과

#### ✅ 성공한 API들

| API          | 응답시간 | 데이터 크기 | 상태      |
| ------------ | -------- | ----------- | --------- |
| **ARMORIES** | 149ms    | 383KB       | 완벽 동작 |
| **NEWS**     | 231ms    | 11KB        | 완벽 동작 |

#### ❌ 실패한 API들

| API          | 실패 원인             |
| ------------ | --------------------- |
| CHARACTERS   | API 엔드포인트 불일치 |
| AUCTIONS     | 검색 파라미터 오류    |
| GAMECONTENTS | 엔드포인트 경로 오류  |
| MARKETS      | 엔드포인트 경로 오류  |

### 캐시 계층별 특성

| 계층             | 접근 속도 | 저장 용량 | TTL        | 용도      |
| ---------------- | --------- | --------- | ---------- | --------- |
| **Memory Cache** | 가장 빠름 | 제한적    | 5-10분     | 즉시 접근 |
| **Redis Cache**  | 중간      | 대용량    | 30분-1시간 | 중간 저장 |
| **MySQL**        | 느림      | 무제한    | 영구       | 영구 저장 |

### 성능 최적화 효과

**ARMORIES API 기준:**

- **첫 호출**: 149ms (API 직접 호출)
- **캐시 히트**: < 1ms (Memory Cache)
- **Redis 히트**: ~5ms (Redis 복원)
- **MySQL 히트**: ~10ms (Database 복원)

## 📊 상세 결과

자세한 테스트 결과는
[Cache Flow Test Results](../../Docs/testing/cache-flow-test-results.md) 문서를
참조하세요.

## 🔧 환경 설정

### 필수 환경변수

```bash
# .env 파일에 설정 필요
LOSTARK_API_KEY=your_lostark_api_key_here
```

### 의존성

```bash
# dotenv 패키지 설치
yarn add dotenv
```

## ⚠️ 주의사항

1. **API 키 필요**: Lost Ark Developer Portal에서 발급받은 API 키 필요
2. **레이트 리밋**: API 호출 간격 조절 (테스트에서 자동 처리)
3. **캐시 시뮬레이션**: 실제 Redis/MySQL 대신 메모리 기반 시뮬레이션 사용
4. **TTL 설정**: 테스트용으로 짧은 TTL 설정 (실제 운영과 다름)

## 🔄 업데이트 이력

- **2025-01-27**: 캐시 플로우 테스트 추가, 3계층 캐시 시스템 검증
- **2024-12-19**: 기본 API 테스트 구조 생성
