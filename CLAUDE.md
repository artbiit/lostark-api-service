# lostark-remote-kakao

로스트아크 공식 Developer API (`developer-lostark.game.onstove.com`) 를 **Fastify 기반 HTTP 서비스로 래핑·캐싱·재노출** 하는 독립 백엔드. 하위 소비자(LoA-Bot Discord 봇, 웹 대시보드 등) 의 공용 업스트림 역할을 한다.

## 프로젝트 목적

- 로스트아크 공식 API 호출 집중화 (레이트 리밋 단일 지점 관리).
- 3-tier 캐시 계층 (프로세스 메모리 / Redis / MySQL) 로 반복 조회 비용·지연 절감.
- 소비자 친화적인 자체 REST 계약 제공 (Swagger UI + `openapi.yaml` dump).
- 장기적으로 UDP 기반 실시간 채널 병행.

## 기술 스택

| 구분 | 선택 |
| --- | --- |
| 런타임 | Node.js 22+ |
| 언어 | TypeScript (ESM, NodeNext) |
| 패키지 매니저 | **Yarn Berry (PnP, strict mode)** |
| 모노레포 | `packages/*` (shared / data-service / rest-service / udp-service) |
| HTTP 프레임워크 | Fastify 4 + `@fastify/swagger`, `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit` |
| 캐시 | 프로세스 메모리 + Redis (optional, `CACHE_REDIS_URL`) |
| 영속 저장소 | MySQL (`mysql2`) — 업스트림 응답 스냅샷 |
| 검증 | zod |
| 로거 | 자체 로거 (`packages/shared/src/config/logger.ts`) |
| 테스트 러너 | **Node `node:test` (tsx --test)** — vitest 아님 |
| 린트 / 포매터 | ESLint + Prettier + lint-staged |
| Git hook | Husky (pre-commit: 의존성 검증 + unit, pre-push: 전체 테스트 + 빌드) |
| 컨테이너 | Docker (멀티 패키지 동시 기동은 `loa-platform` 의 docker-compose 가 담당) |

## 패키지 구성

| 디렉터리 | npm 이름 | 역할 |
| --- | --- | --- |
| `packages/shared/` | `@lostark/shared` | env / logger / MySQL / Redis / 공통 타입 (V7/V8/V9 로스트아크 API 타입 포함) |
| `packages/data-service/` | `@lostark/data-service` | 업스트림 HTTP 클라이언트, normalizer, 3-tier 캐시, 도메인 서비스 |
| `packages/rest-service/` | `@lostark/rest-api` | Fastify REST 서버, Swagger UI, OpenAPI dump 스크립트 |
| `packages/udp-service/` | `@lostark/udp-gateway` | UDP 게이트웨이 (실시간 채널용) |

주의: 디렉터리명과 패키지명이 완전 일치하지 않는다 (`rest-service` ↔ `@lostark/rest-api`, `udp-service` ↔ `@lostark/udp-gateway`). 둘 다 감내.

## 실행 환경

- 개발: macOS / Windows.
- 배포: Rocky Linux 9 + Docker. 오케스트레이션은 `../loa-platform/docker-compose.yml` (공용 Kord 인프라의 postgres/redis 네트워크 공유).
- MySQL / Redis 는 외부에서 이미 구동 중이라고 가정. 이 레포 내부 `docker-compose.yml` 의 자체 db/redis 는 **개발 전용**.

## 주요 명령어

```bash
yarn install              # PnP 설치 (.pnp.cjs 생성)
yarn dev                  # 전체 워크스페이스 watch 빌드
yarn build                # 전체 dist/ 빌드
yarn start                # 기본 시작 = yarn workspace @lostark/fetch start
yarn typecheck            # tsc --noEmit (전 패키지)
yarn test                 # tsx --test tests/**/*.test.ts
yarn test:unit            # tests/unit/**
yarn test:integration     # tests/integration/**
yarn test:api             # tests/api/**
yarn test:cache-flow      # 캐시 동선 엔드투엔드 스크립트
yarn lint                 # ESLint (전 패키지)
yarn format               # Prettier --check
yarn check                # typecheck + lint + format
yarn validate:monorepo    # 순환 참조 + project references 검증
yarn validate:full        # precommit 상위 (monorepo + test + build + lint)

yarn workspace @lostark/rest-api dump:openapi   # openapi.yaml dump
```

### Husky hook

- `pre-commit` → `yarn precommit` = `validate:monorepo && test:unit && lint`
- `pre-push` → `yarn prepush` = `validate:monorepo && test && build`

hook 실패 시 강제 우회(`--no-verify`) 금지. 근본 원인을 찾아 고친다.

## 프로젝트 구조

```
lostark-remote-kakao/
├── packages/
│   ├── shared/src/            # env, logger, mysql, redis, 로스트아크 API 타입(V7/V8/V9)
│   ├── data-service/src/
│   │   ├── clients/           # 업스트림 호출 (axios-like fetch 래퍼)
│   │   ├── normalizers/       # 응답 정규화 (ArmoryProfile 등)
│   │   ├── cache/             # 3-tier 캐시 레이어
│   │   └── services/          # 도메인 단위 서비스 (armory/siblings/markets/...)
│   ├── rest-service/src/
│   │   ├── index.ts           # 엔트리
│   │   └── server.ts          # Fastify 인스턴스 + 플러그인 등록 + 라우트
│   └── udp-service/src/       # UDP 게이트웨이
├── docs/                       # docs-first 문서 (아래 섹션 참조)
├── tests/                      # 통합/단위/api 테스트 (루트에서 실행)
├── scripts/
│   ├── validate-dependencies.mjs
│   └── validate-references.mjs
├── tools/
├── legacy/                     # 구버전 참고 자료
├── .yarnrc.yml                 # PnP 설정 (nodeLinker: pnp, pnpMode: strict)
├── tsconfig.base.json
└── CLAUDE.md                   # ← 이 파일
```

### 레이어 규칙

- **shared 는 상위 의존성을 갖지 않는다.** 나머지 패키지가 전부 shared 에 의존.
- **rest-service 는 도메인 로직을 갖지 않는다.** 요청 파싱 → data-service 서비스 호출 → 응답 포맷팅.
- **data-service 는 Fastify 타입을 import 하지 않는다.** 재사용 가능하도록 HTTP 프레임워크 중립.
- Project references 는 `scripts/validate-references.mjs` 가 검증. 수동 추가/제거 후 반드시 `yarn validate:monorepo`.

## 환경변수

`.env` 는 커밋 금지, `.env.example` 이 레퍼런스. shared 의 `env.ts` 에서 zod 로 파싱한 뒤에만 사용.

핵심 키:

- `LOSTARK_API_KEY` — developer portal 발급 토큰
- `LOSTARK_API_VERSION` — 기본 `V9.0.0`
- `FETCH_RATE_LIMIT_PER_MINUTE` — 공식 API 리밋 (기본 100)
- `REST_SERVER_HOST`, `REST_SERVER_PORT` (기본 0.0.0.0:3000)
- `CACHE_REDIS_URL`, `CACHE_REDIS_PASSWORD` (선택)
- MySQL 관련 키는 `.env.example` 참조 (DB 이름, 사용자, 호스트 등)

## Yarn Berry (PnP) 주의사항

- **`node_modules/` 가 없다.** 에디터/툴이 `.pnp.cjs` 를 이해해야 한다. VS Code 의 경우 `.yarn/sdks/` 가 설정되어 있어야 함 (`yarn dlx @yarnpkg/sdks vscode`).
- ESLint / Prettier / tsx 전부 PnP 모드로 동작. 충돌이 의심되면 `.yarnrc.yml` 의 `nodeLinker` 부터 확인.
- **`@fastify/swagger` 등의 `declare module 'fastify'` 모듈 증강이 PnP + tsc 조합에서 타입 체크에 반영되지 않는 이슈가 있다** (2026-04-23 확인). 해결책:
  1. 국소 캐스트 (권장): `(fastify as unknown as { swagger: () => unknown }).swagger()` 로 해당 호출만 우회.
  2. 로컬 증강 파일 (`src/types/fastify-augment.d.ts`) 에 직접 `declare module 'fastify'` 작성.
  - 증상을 만나면 패키지 버전 추적 전에 이 가설부터 확인.

## 테스트 전략

- **루트의 `tests/` 디렉터리가 단일 테스트 집합.** 패키지별 개별 테스트가 아니라 `tests/unit/<pkg>/`, `tests/integration/`, `tests/api/` 로 분류됨.
- 러너는 **Node 내장 `node:test` (tsx 로 실행)**. `describe/it` 이 아닌 `test()` 형태. vitest/jest 형식 코드 작성 금지.
- `.env` 를 dotenv 로 로드한 뒤 검증 (`tests/config` 하위). 테스트 전에 `.env` 존재 필수.
- HTTP 모킹은 필요 시 `msw` 또는 fetch 스텁. 공식 API 직접 호출은 `test:cache-flow` 류에서만.
- 통합 테스트는 실제 Redis/MySQL 에 붙는다 — CI 에서는 docker compose 로 준비된 인스턴스 기대.

## REST API 계약 관리

- Fastify route schema (`schema: { response: { ... } }`) 가 Swagger UI / `openapi.yaml` dump 의 단일 원천.
- `yarn workspace @lostark/rest-api dump:openapi` → `docs/contracts/` 아래로 자동 반영 (스크립트가 직접 쓰는 경로 확인).
- 계약 breaking change 는 **ADR 로 기록**하고 소비자 (`../LoA-Bot` 등) 에게 사전 공지. `LoA-Bot` 은 `openapi-typescript` 로 본 계약을 직접 타입 생성한다.

## 로깅 / 에러 대응

- `packages/shared/src/config/logger.ts` 의 구조적 JSON 로거 사용. 요청 범위 자식 로거는 Fastify의 `request.log` 활용.
- 업스트림 실패는 `DataServiceUpstreamError` 류로 감싸고, REST 레이어에서 적절한 HTTP status 로 매핑.
- 장애 이력은 `docs/issues/` 에 기록.

## 문서화 정책 (docs-first)

어떤 작업이든 시작 전에 **`docs/index.md`** 를 먼저 읽고, 관련 카테고리의 `index.md` → 구체 문서 순으로 탐색한다.

- 카테고리: `adr/ analysis/ architecture/ backlog/ changes/ contracts/ development/ domain/ issues/ maintenance/ security/ work-log/ graph/`
- 새 문서 추가 시 해당 카테고리의 `index.md` 에 링크 한 줄 추가.
- ADR 은 불변 (append-only, 번호제). 뒤집을 때는 새 ADR 로 supersede.
- 파일 경로는 **항상 소문자 `docs/`** 유지 (2026-04-27 정리 이후). `Docs/` 로 새로 만드는 일 없도록.
- 도메인 용어는 로스트아크 원어(각인/카오스 게이트/시블링 등) 그대로.

## 구조 탐색 / graphify 운용

- 모듈 의존 지도나 Fastify 라우트 토폴로지 파악이 필요하면 **`docs/graph/index.md`** (메타) 를 먼저 확인.
- `last_generated_at` / `source_commit` 이 최근 커밋 대비 낡았다고 의심되면 **`graph-refresh-checker` 서브에이전트** 를 호출해 staleness 판정을 받는다 (`.claude/agents/graph-refresh-checker.md`).
- 판정이 `partial-stale` / `fully-stale` / `no-graph` 이면 메인 에이전트가 직접 **`/graphify`** 를 호출해 재생성한다.
- 권장 scope: `packages/*/src`, `docs/contracts` (OpenAPI dump 결과물), 필요 시 `tests/`.
- 선제적 재생성 시점: 첫 작업 진입 시 그래프 부재, 신규 패키지 추가, 대규모 리팩터링, 10개 이상 파일 이동/삭제 직후, 커밋/PR 직전 구조 변경 동반.
- **재생성 전**: 기존 scope 디렉토리를 `rm -rf` 로 정리, 폐기된 scope 산출물도 함께 삭제. `docs/graph/index.md` 의 frontmatter 와 Scopes 표 갱신.
- **산출물 본체(HTML/JSON/audit) 는 gitignore**. `docs/graph/index.md` 와 `docs/graph/.gitignore` 만 커밋.

## 코딩 규칙

- 비동기는 `async/await`. callback 지양.
- ESM 환경이지만 `tsconfig.json` 의 `module: NodeNext` 를 따른다 → `.ts` 소스에서도 상대 import 는 `.js` 확장자 표기 (`from './foo.js'`).
- 도메인 로직에서 Fastify 타입 직접 참조 금지 (rest-service 경계 내에서만).
- 새 환경변수는 `packages/shared/src/config/env.ts` 의 zod 스키마에 먼저 등록.
- MySQL 스키마 변경은 마이그레이션으로 처리 (`packages/shared/src/db/migrations.ts` 기반). 자동 반영 금지.
- 커밋 전 `yarn check` (typecheck + lint + format) 통과 확인.
- Husky hook 을 건너뛰는 커밋/푸시는 금지 (`--no-verify` 사용 금지).

## 형제 레포

같은 부모 디렉터리(`stz/loa/`) 에 수평 배치:

- **`../LoA-Bot`** — Discord 봇. 이 서비스의 주요 소비자. `openapi-typescript` 로 여기 REST 타입을 직접 생성.
- **`../loa-platform`** — 오케스트레이션 전용 레포. docker-compose + 공용 운영 문서. 코드 없음.

REST 계약이 바뀌면 `../LoA-Bot/src/infra/lostark/generated.ts` 재생성이 필요하므로, 계약 변경 커밋 메시지에 그 사실을 명시.
