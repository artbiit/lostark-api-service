# Legacy Code Reference Guide

> **⚠️ 주의**: 이 디렉토리는 기존 CommonJS 기반 코드를 보관하는 레거시
> 코드입니다. 새로운 TypeScript + ESM 기반 모노레포 구조로 마이그레이션
> 중입니다.

## 📁 구조

```
legacy/
├── index.js              # 애플리케이션 진입점
├── libs/                 # 공통 유틸리티
│   ├── API.js           # Lost Ark API 클라이언트
│   ├── env.js           # 환경변수 관리
│   ├── logger.js        # 로깅 유틸리티
│   └── utils.js         # 공통 유틸리티 함수
├── src/                  # 서비스 로직
│   ├── Mysql/           # MySQL 데이터베이스 서비스
│   ├── Service/         # 메인 서비스 로직
│   │   └── Commands/    # 명령어 처리 모듈
│   └── scheduler.js     # 스케줄러
└── loa.sql              # 데이터베이스 스키마
```

## 🔧 주요 기능

### 1. 진입점 (`index.js`)

- 애플리케이션 초기화
- 글로벌 객체 설정 (logger, utils, env)
- MySQL 서비스 연결
- 스케줄러 및 서비스 시작

### 2. 공통 라이브러리 (`libs/`)

#### `API.js`

- Lost Ark API 클라이언트
- 캐릭터 정보, 경매장, 게임 콘텐츠 API 호출
- 에러 처리 및 재시도 로직

#### `env.js`

- 환경변수 관리
- 설정값 검증

#### `logger.js`

- 로깅 시스템 (pino 기반)
- 로그 레벨 관리

#### `utils.js`

- 공통 유틸리티 함수
- 시간 처리, 문자열 변환 등

### 3. 서비스 로직 (`src/`)

#### `Mysql/MysqlService.js`

- MySQL 데이터베이스 연결 관리
- 쿼리 실행 및 결과 처리

#### `Service/Service.js`

- 메인 서비스 로직
- 명령어 처리 및 라우팅

#### `Service/Commands/`

- 각종 명령어 처리 모듈
  - `armories.js`: 아르모리 정보
  - `auctions.js`: 경매장 정보
  - `character.js`: 캐릭터 정보
  - `gamecontents.js`: 게임 콘텐츠
  - `markets.js`: 시장 정보
  - `mingame.js`: 미니게임
  - `help.js`: 도움말
  - `test.js`: 테스트 명령어

#### `scheduler.js`

- 주기적 작업 스케줄링
- 데이터 갱신 및 정리

## 🔄 마이그레이션 매핑

### 새로운 구조로의 변환 계획

| 레거시                  | 새로운 구조              | 상태         |
| ----------------------- | ------------------------ | ------------ |
| `libs/API.js`           | `packages/data-service/` | 🔄 변환 예정 |
| `libs/logger.js`        | `packages/shared/`       | 🔄 변환 예정 |
| `libs/utils.js`         | `packages/shared/`       | 🔄 변환 예정 |
| `src/Service/Commands/` | `packages/rest-service/` | 🔄 변환 예정 |
| `src/Mysql/`            | `packages/shared/`       | 🔄 변환 예정 |
| `scheduler.js`          | `packages/data-service/` | 🔄 변환 예정 |

## 📋 참조 시 주의사항

1. **CommonJS → ESM**: `require()` → `import/export` 변환 필요
2. **타입 안정성**: TypeScript 타입 정의 추가 필요
3. **모듈화**: 기능별 패키지 분리 필요
4. **테스트**: 단위 테스트 추가 필요
5. **환경변수**: 새로운 설정 시스템 적용 필요

## 🚀 실행 방법

```bash
# 레거시 코드 실행 (참조용)
cd legacy
node index.js
```

## 📝 TODO

- [ ] TypeScript 변환
- [ ] ESM 모듈 시스템 적용
- [ ] 패키지별 분리
- [ ] 단위 테스트 작성
- [ ] 새로운 설정 시스템 적용
- [ ] 로깅 시스템 개선
- [ ] 에러 처리 강화
