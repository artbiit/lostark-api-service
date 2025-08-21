# Lost Ark API Service

3계층 아키텍처 기반의 Lost Ark API 통합 서비스

## 🏗️ 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UDP Gateway   │    │   REST API      │    │   Fetch Layer   │
│   (3계층)        │    │   (2계층)        │    │   (1계층)        │
│                 │    │                 │    │                 │
│ • 초저지연 전송   │    │ • 정규화된 데이터 │    │ • 외부 API 호출  │
│ • 기존 메시지     │    │ • 필요시 Fetch   │    │ • 데이터 정규화  │
│   규격 유지      │    │   호출          │    │ • 캐싱          │
│ • Lock-free 큐   │    │ • Fastify 기반  │    │ • 스케줄러      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

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

- **Fetch Layer**: API 호출 제한, 재시도, 서킷브레이커
- **REST API**: 포트, CORS, 레이트리밋
- **UDP Gateway**: 포트, 메시지 크기, 워커 풀
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

# Fetch Layer 시작
yarn start
```

## 📁 프로젝트 구조

```
lostark-remote-kakao/
├── packages/
│   ├── shared/                    # 공통 모듈
│   │   ├── src/
│   │   │   ├── config/           # 환경설정, 로깅
│   │   │   ├── types/            # 타입 정의 (버전별)
│   │   │   ├── utils/            # 유틸리티
│   │   │   └── db/               # 데이터베이스
│   │   └── package.json
│   │
│   ├── fetch/                     # 1계층: Fetch & Normalize
│   │   ├── src/
│   │   │   ├── clients/           # Lost Ark API 클라이언트
│   │   │   ├── normalizers/       # 데이터 정규화
│   │   │   ├── cache/             # 캐시 관리
│   │   │   └── scheduler.ts       # 스케줄러
│   │   └── package.json
│   │
│   ├── rest-api/                  # 2계층: REST API
│   │   ├── src/
│   │   │   ├── routes/            # Fastify 라우트
│   │   │   ├── middleware/        # 미들웨어
│   │   │   └── plugins/           # Fastify 플러그인
│   │   └── package.json
│   │
│   └── udp-gateway/               # 3계층: UDP Gateway
│       ├── src/
│       │   ├── handlers/          # 메시지 핸들러
│       │   ├── queue/             # lock-free 큐
│       │   └── workers/           # 워커 풀
│       └── package.json
│
├── cache/                         # 캐시 데이터
├── Docs/                          # 문서
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

## 📊 성능 목표

- **REST API**: p95 ≤ 50ms (캐시 히트 기준)
- **UDP Gateway**: p95 ≤ 10ms (캐시 히트 기준)
- **Fetch Layer**: 싱글플라이트, 서킷브레이커, 지수백오프 재시도

## 🛡️ 안정성

- **Graceful Degrade**: 외부 API 장애 시 캐시 서빙
- **Circuit Breaker**: 외부 API 호출 실패 시 자동 차단
- **Rate Limiting**: REST와 Fetch 분리 관리
- **Error Handling**: 명확한 에러 코드와 메시지

## 📝 개발 가이드

자세한 개발 가이드는 [Docs/development-guide.md](Docs/development-guide.md)를 참조하세요.

## 📄 라이선스

ISC License
