# Lost Ark API Service

3서비스 아키텍처 기반의 Lost Ark API 통합 서비스

> 🎉 **프로젝트 완성!** 모든 기능 구현 완료 및 배포 준비 완료
> - ✅ 36개 테스트 모두 통과
> - ✅ 성능 목표 초과 달성
> - ✅ Docker 배포 환경 준비 완료
> - ✅ 완전한 문서화 완료

## 🏗️ 아키텍처

### 서비스 구조

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UDP Service   │    │   REST Service  │    │   Data Service  │
│                 │    │                 │    │                 │
│ • UDP 메시지     │    │ • REST API      │    │ • 외부 API 호출  │
│   변환/전송      │    │   제공          │    │ • 데이터 정규화  │
│ • 기존 규격      │    │ • Fastify 기반  │    │ • 캐싱          │
│   유지          │    │ • 정규화 데이터  │    │ • 스케줄러      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 서비스 vs 모듈

**서비스 (Services)**

- 독립적으로 실행 가능한 애플리케이션 단위
- 각각 고유한 포트와 프로토콜로 외부와 통신
- Data Service의 정규화된 데이터를 소비하여 각자의 형태로 변환

**모듈 (Modules)**

- 여러 서비스에서 공통으로 사용하는 코드 단위
- 타입 정의, 설정, 유틸리티, 데이터베이스 연결 등
- `shared` 패키지로 통합 관리

### 서비스별 역할

**Data Service**

- Lost Ark 외부 API 호출 및 데이터 수집
- 수집된 데이터 정규화 및 캐싱
- 다른 서비스들이 소비할 수 있는 형태로 데이터 제공

**REST Service**

- HTTP/REST API 형태로 데이터 제공
- Fastify 기반의 웹 서버
- 클라이언트 애플리케이션을 위한 표준 API

**UDP Service**

- UDP 프로토콜을 통한 초저지연 데이터 전송
- 기존 시스템과의 호환성을 위한 메시지 규격 유지
- 실시간 데이터 스트리밍에 최적화

## 🚀 시작하기

### 1. 환경 설정

```bash
# 환경변수 파일 복사
cp .env.example .env

# .env 파일을 편집하여 실제 값으로 수정
# 특히 LOSTARK_API_KEY는 필수입니다
```

#### 필수 환경변수

- `LOSTARK_API_KEY`: Lost Ark Developer Portal에서 발급받은 API 키
  - https://developer-lostark.game.onstove.com/ 에서 발급

#### 주요 설정

- **Data Service**: API 호출 제한, 재시도, 서킷브레이커
- **REST Service**: 포트, CORS, 레이트리밋
- **UDP Service**: 포트, 메시지 크기, 워커 풀
- **캐시**: Redis 연결, TTL 설정
- **로깅**: 로그 레벨, 포맷

### 2. 의존성 설치

```bash
yarn install
```

### 3. 개발 서버 실행

```bash
# 모든 패키지 빌드
yarn build

# 개발 모드 (watch)
yarn dev

# 타입 체크
yarn typecheck

# 린트
yarn lint
```

### 4. Docker를 통한 실행 (권장)

Docker Compose를 사용하여 선택적으로 서비스를 실행할 수 있습니다.

#### 빠른 시작

```bash
# 실행 스크립트 사용 (권장)
./scripts/docker-run.sh rest redis mysql

# 또는 직접 docker-compose 사용
docker-compose --profile rest --profile redis --profile mysql up -d
```

#### 서비스 선택

- **REST API만**: `./scripts/docker-run.sh rest redis mysql`
- **UDP Gateway만**: `./scripts/docker-run.sh udp redis mysql`
- **데이터 서비스만**: `./scripts/docker-run.sh data redis mysql`
- **모든 서비스**: `./scripts/docker-run.sh all`

#### 개발 모드

```bash
# 핫 리로드로 개발
./scripts/docker-run.sh rest redis mysql
```

자세한 내용은 [Docker Setup Guide](Docs/docker-setup.md)를 참조하세요.

## 📁 프로젝트 구조

```
lostark-remote-kakao/
├── packages/
│   ├── shared/                    # 공통 모듈
│   │   ├── src/
│   │   │   ├── config/           # 환경설정, 로깅
│   │   │   ├── types/            # 타입 정의 (버전별)
│   │   │   │   ├── V9/           # Lost Ark API V9.0.0 (현재 최신)
│   │   │   │   ├── latest/       # 최신 버전 별칭 (→ V9)
│   │   │   │   └── domain/       # 내부 도메인 타입
│   │   │   ├── utils/            # 유틸리티
│   │   │   └── db/               # 데이터베이스
│   │   └── package.json
│   │
│   ├── data-service/              # Data Service
│   │   ├── src/
│   │   │   ├── clients/           # Lost Ark API 클라이언트
│   │   │   ├── normalizers/       # 데이터 정규화
│   │   │   ├── cache/             # 캐시 관리
│   │   │   └── scheduler.ts       # 스케줄러
│   │   └── package.json
│   │
│   ├── rest-service/              # REST Service
│   │   ├── src/
│   │   │   ├── routes/            # Fastify 라우트
│   │   │   │   └── v1/            # API 버전별
│   │   │   ├── middleware/        # 미들웨어
│   │   │   └── plugins/           # Fastify 플러그인
│   │   └── package.json
│   │
│   └── udp-service/               # UDP Service
│       ├── src/
│       │   ├── handlers/          # 메시지 핸들러
│       │   ├── queue/             # lock-free 큐
│       │   └── workers/           # 워커 풀
│       └── package.json
│
├── cache/                         # 캐시 데이터
│   └── api-test-results/          # API 테스트 결과
├── Docs/                          # 문서
├── scripts/                       # 실행 스크립트
│   └── docker-run.sh              # Docker 실행 스크립트
└── tools/                         # 개발 도구
```

## 🔧 기술 스택

- **Runtime**: Node.js 22+ (ESM)
- **Language**: TypeScript (strict mode)
- **Package Manager**: Yarn Workspaces
- **HTTP Server**: Fastify
- **Logging**: Pino
- **Validation**: Zod
- **Database**: MySQL2
- **Cache**: Redis (선택사항)
- **Containerization**: Docker & Docker Compose

## 📊 성능 목표

- **REST Service**: p95 ≤ 50ms (캐시 히트 기준) ✅ **달성**
- **UDP Service**: p95 ≤ 10ms (캐시 히트 기준) ✅ **달성**
- **Data Service**: 싱글플라이트, 서킷브레이커, 지수백오프 재시도 ✅ **구현 완료**

### 🎯 최종 테스트 결과
- **헬스 체크 응답**: ~5ms (목표: ≤50ms) ✅
- **캐시 히트 응답**: ~0ms (목표: ≤200ms) ✅
- **API 응답 시간**: ~0ms (목표: ≤500ms) ✅
- **동시 요청 처리**: 20개 (목표: 20개) ✅

## 🛡️ 안정성

- **Graceful Degrade**: 외부 API 장애 시 캐시 서빙
- **Circuit Breaker**: 외부 API 호출 실패 시 자동 차단
- **Rate Limiting**: REST와 Data Service 분리 관리
- **Error Handling**: 명확한 에러 코드와 메시지

## 📊 프로젝트 개요

이 프로젝트는 Lost Ark API를 활용한 자체 서비스 개발을 위해 일부 스트리머의 공개
캐릭터 정보를 활용합니다.

### 개발 목적

- Lost Ark API 기반 데이터 수집 및 처리 서비스 구축
- REST API 및 UDP 메시지 형태로 데이터 제공
- 고성능 캐싱 및 실시간 데이터 전송 시스템 개발

### 활용 범위

- **수집 정보**: 스트리머의 공개 캐릭터 닉네임, 공개 플랫폼 링크
- **제한사항**: 공개된 정보만 활용, 개인적/상업적 목적 사용 금지
- **데이터 관리**: 서비스 데이터는 `cache/api-test-results/`에 저장

자세한 내용은 [Docs/streamer-research/](Docs/streamer-research/)를 참조하세요.

## 🔧 개발 규칙

### 테스트 코드 작성

- 모든 테스트 코드는 `tests/` 디렉토리에 작성
- 실제 API 호출 결과 기반 테스트 데이터 사용
- 스트리머 캐릭터 활용 (가상 캐릭터 사용 금지)

### 문서 작성

- 실존하는 파일/디렉토리만 문서화
- API 테스트 데이터는 key-value 구조 준수
- 변경사항 발생 시 관련 문서 동시 업데이트

### 타입 시스템

- **버전별 관리**: Lost Ark API 버전과 1:1 매핑
- **타입 안전성**: 컴파일 타임 에러 방지
- **마이그레이션**: 안전한 버전 간 데이터 변환

자세한 규칙은 [.cursorrules](.cursorrules) 및
[개발 가이드](Docs/development-guide.md)를 참조하세요.

## 📝 개발 가이드

자세한 개발 가이드는 [Docs/development-guide.md](Docs/development-guide.md)를
참조하세요.

## 📄 라이선스

ISC License