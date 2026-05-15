# 문서화 가이드라인 (lostark-remote-kakao)

## 목적

이 프로젝트의 문서는 구현 변경, 분석 결과, 운영 지식, 개발 기준, 도메인 지식을
나중에 다시 찾을 수 있게 **재현 가능(reproducible)** 하게 남기기 위한
용도입니다. 에이전트(사람/AI) 가 작업 전에 `docs/index.md` 를 엔트리포인트로
탐색하고, 관련 문서를 확인한 후 구현에 착수하는 **docs-first 워크플로우** 를
전제로 합니다.

## 기본 원칙

- **존재하는 파일/함수/설정/커맨드만** 언급합니다. TypeScript 경로는 소스 기준
  (`packages/data-service/src/normalizers/armory.ts`) 으로 적되, ESM import
  경로(`./armory.js`)와 헷갈리지 않게 "소스 경로" 임을 문맥에서 분명히 합니다.
- 경로는 **프로젝트 루트 기준 상대 경로** 로 적습니다. 예:
  `packages/shared/src/config/env.ts`, `docs/architecture/cache-3tier.md`.
- 문서는 작고 집중되게 유지하고, 한 문서에는 하나의 주 목적만 둡니다.
- 추측성 미래 계획보다 현재 확인 가능한 사실과 결과를 우선 기록합니다. 장기
  로드맵은 `work-log/` 가 아닌 `backlog/` 로 분리합니다.
- 제목과 본문 키워드는 검색 가능하도록 핵심 용어(라우트 경로, 엔티티명, 캐시 키,
  도메인 용어) 를 포함합니다.
- **도메인 용어는 원어 유지**: "레이드", "각인", "카오스 게이트", "시블링",
  "어빌리티 스톤" 등 로스트아크 공식/유저 표기를 그대로 사용합니다. 번역하지
  않습니다.

## 카테고리 선택

- 카테고리는 "무엇이 바뀌었는가" 보다 **"이 문서를 왜 다시 찾는가"** 를 기준으로
  고릅니다.
- `changes/` 는 실제 런타임 동작이 바뀐 경우의 changelog 에만 사용합니다.
- 분류 기준 상세는
  [`document-category-classification.md`](./document-category-classification.md)
  를 따릅니다.

## 구조

- 모든 프로젝트 문서는 `docs/` 아래에 둡니다 (소문자).
- 루트 색인은 `docs/index.md` 입니다. **모든 작업 진입 시 먼저 이 파일을
  읽습니다.**
- 카테고리별 문서는 `docs/<category>/` 아래에 두고, 각 카테고리의 `index.md` 를
  유지합니다.
- 새 문서를 추가하면 **반드시 해당 카테고리의 `index.md` 에 링크를 추가**
  합니다.
- 구조/의존성 지도가 필요하면 `docs/graph/` (graphify 산출물) 을 참조합니다.
  HTML/JSON 본체는 gitignore 대상이며 `docs/graph/index.md` (메타) 만 커밋
  대상입니다.

## 내용 규칙

- 문서 목적에 맞게 무엇이 바뀌었는지, 왜 바뀌었는지, 어디에 영향을 주는지
  기록합니다.
- 구현 변경 문서는 영향을 받는 경로와 검증 결과를 함께 적습니다. 검증 표기는
  [verification-strategies.md](./verification-strategies.md) 의 L1~L4 사다리에
  맞춰: `yarn typecheck`, `yarn test:unit`, `yarn test:integration`, 수동 REST
  스모크(`curl <route>` 또는 Swagger UI), 캐시 동선 standalone
  스크립트(`node tests/integration/api/*-cache-flow-test.mjs`).
- 공식 로스트아크 API (`developer-lostark.game.onstove.com`) 동작/스키마가
  바뀌는 경우 가능하면 **원인(cause) → 수정(fix) → 영향(impact)** 순서로
  정리하고, 영향 받는 normalizer / 타입(`packages/shared/src/types/V7|V8|V9/**`)
  을 명시합니다.
- 자체 REST 계약이 바뀌는 경우 `yarn workspace @lostark/rest-api dump:openapi`
  산출물(`docs/contracts/openapi.yaml`) 의 diff 와 LoA-Bot 의
  `openapi-typescript` 재생성 필요 여부를 함께 기록합니다.
- 보안 관련 변경이 있으면 아래 관점에서 점검해 기록합니다.
  - **입력 검증**: zod 스키마 사용 여부 (env / route schema / 외부 응답
    normalizer 입력 검증). Fastify route schema 의 `body` / `querystring` /
    `params` validator 적용 여부.
  - **권한 검증**: API 키 검증 미들웨어, `@fastify/rate-limit` 정책, caller 분리
    (이 서비스는 길드/유저 단위 tenant 가 아니라 API 키 기반 caller 구분).
  - **DB 보안**: `mysql2` 의 prepared statement / 파라미터 바인딩(`?`) 사용
    여부. 문자열 보간으로 raw SQL 을 만들지 말 것 — 사용 시 근거 명시.
  - **비밀 값 취급**: `.env` 이외 경로에 토큰/키 노출 여부, 로그 마스킹
    (`packages/shared/src/config/logger.ts` 의 redaction 설정).
  - **외부 노출**: `@fastify/helmet` / `@fastify/cors` 정책 변경 시 영향 범위,
    Swagger UI 가 prod 에 노출되는지 여부.

## 분리 기준

- 문서가 1000줄 이상으로 커지면 분리합니다.
- 분리 기준은 기능(feature), 도메인(armories/siblings/markets/auctions/...),
  단계(phase: 명세/구현/운영) 중 목적에 맞는 축을 고릅니다.
- 분리 후에는 관련 교차 링크와 `index.md` 를 함께 갱신합니다.

## 권장 템플릿

- **요약(Summary)**: 무엇을, 왜 기록하는지
- **배경(Background)**: 문제, 요구사항, 맥락
- **원인(Root cause)**: 재현 가능한 수준의 근거 (해당 시)
- **수정 또는 결론(Fix / Findings)**: 핵심 변경점 또는 분석 결과
- **검증(Test plan)**: 확인한 케이스와 방법 — `tests/unit/**` /
  `tests/integration/**` 의 `node:test` 파일 경로, 수동 Fastify 스모크 시나리오,
  캐시 동선 스크립트
- **보안(Security)**: 입력 검증/권한/DB/비밀 값/외부 노출 관점 점검 (해당 시)
- **관련 링크(References)**: 관련 문서, 코드 경로, 커밋 SHA, 공식 로스트아크 API
  엔드포인트, OpenAPI dump SHA

## ADR 규칙

`docs/adr/` 는 **불변(append-only)** 입니다.

- 파일명: `ADR-NNNN-kebab-case-title.md` (NNNN 은 0001 부터 순차 증가)
- 결정을 뒤집을 때: 기존 ADR 을 수정하지 않고, 새 ADR 을 발행하여 "supersedes
  ADR-NNNN" 명시. 기존 문서에도 "superseded by ADR-MMMM" 한 줄만 append.
- 기본 섹션: Context / Decision / Consequences / Alternatives considered.

## graphify 산출물 관리 규칙

- 그래프 본체(HTML/JSON/audit) 는 `docs/graph/<scope>/` 하위에 두되 **gitignore
  대상**. 재생성 가능하므로 저장소 비대화 방지.
- `docs/graph/index.md` 는 커밋 대상. scope 별 마지막 생성 시각, 소스 커밋 SHA,
  요약 통계를 기록.
- 더 이상 관련 없는 scope (제거된 모듈, 폐기된 기능) 의 그래프 산출물은 **삭제**
  합니다. 메인 에이전트가 `graph-refresh-checker` 권고를 받아 제거.
- 재생성 전 기존 산출물은 삭제 후 새로 생성하여 혼재 방지.

## 체크리스트

- [ ] 라우트(`packages/rest-service/src/routes/**`) 또는 도메인
      서비스(`packages/data-service/src/services/**`) 추가·제거·이름 변경 시
      `README.md` 또는 관련 `architecture/` / `contracts/` 문서를 갱신했는가?
- [ ] 관련 파일 경로와 식별자(함수/테이블/캐시 키/라우트) 를 정확히 적었는가?
- [ ] 이 문서가 들어갈 카테고리가 목적에 맞는가?
      ([분류 기준](./document-category-classification.md) 재확인)
- [ ] 해당 카테고리의 `index.md` 에 링크를 추가했는가?
- [ ] 변경 또는 분석 결과를 재현 가능한 수준(명령어/커밋 SHA/테스트 파일) 으로
      적었는가?
- [ ] 검증 내용과 영향 범위(어떤 라우트/캐시 계층/MySQL 테이블) 를 적었는가?
- [ ] (해당 시) 입력 검증, 권한, DB 보안, 비밀 값, 외부 노출 관점을 점검했는가?
- [ ] (REST 계약 변경 시) `yarn workspace @lostark/rest-api dump:openapi` 결과를
      갱신·커밋했고 LoA-Bot 측 `openapi-typescript` 재생성 필요성을 명시했는가?
- [ ] 도메인 용어를 원어(로스트아크 표기) 로 썼는가?
