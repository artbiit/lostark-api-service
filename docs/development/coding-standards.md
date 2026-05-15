# 코딩 규칙

이 프로젝트의 **권위 코딩 컨벤션**. CLAUDE.md 가 게이트 차원에서 핵심 항목만
인용하고, 상세는 본 문서를 단일 원천으로 한다.

## 언어 / 모듈

- 비동기는 `async/await`. callback 지양.
- ESM 환경이지만 `tsconfig.base.json` 의 `module: NodeNext` 를 따른다 → `.ts`
  소스에서도 상대 import 는 `.js` 확장자 표기.

  ```ts
  import { foo } from './foo.js'; // ← 옳음 (소스 파일은 foo.ts)
  ```

- 모든 환경변수는 `packages/shared/src/config/env.ts` 의 zod 스키마에 **먼저
  등록** 하고 사용. 직접 `process.env.X` 참조 금지.

## 레이어 경계

- **shared 는 상위 의존성을 갖지 않는다.** 나머지 패키지가 전부
  `@lostark/shared` 에 의존.
- **rest-service 는 도메인 로직을 갖지 않는다.** 요청 파싱 → `data-service` 호출
  → 응답 포맷팅.
- **data-service 는 Fastify 타입을 import 하지 않는다.** HTTP 프레임워크 중립을
  유지해 재사용 가능.
- **도메인 로직(`packages/data-service/`, `packages/shared/`) 에서 Fastify 타입
  직접 참조 금지** — Fastify 타입은 `packages/rest-service/` 경계 내에서만.

## DB

- MySQL 은 `mysql2` 의 prepared statement / 파라미터 바인딩(`?`) 을 사용. 문자열
  보간으로 raw SQL 만들지 말 것 — 사용 시 근거 명시.
- MySQL 스키마 변경은 마이그레이션으로 처리
  (`packages/shared/src/db/migrations.ts` 기반). 자동 반영 금지. 적용은
  [agent-team-protocol](./agent-team-protocol.md) §6 파괴적 조작 게이트 대상.

## 검증 / 빌드

- 커밋 전 `yarn check` (typecheck + lint + format) 통과 확인.
- Husky hook 을 건너뛰는 커밋/푸시는 **금지** (`--no-verify` 사용 금지). hook
  실패 시 근본 원인을 찾아 고친다.
- 변경 범주별 의무 검증 레벨은
  [verification-strategies](./verification-strategies.md) 의 표를 따른다.

## 주석 / 문서화

- 주석은 **WHY 가 비자명할 때만**. 이름/타입으로 자명한 동작 설명 금지.
- 불필요한 리팩터·방어 코드·하위호환 shim 금지. 시스템 경계(외부 API 응답,
  사용자 입력) 에서만 zod 검증.
- 도메인 용어는 로스트아크 원어("각인", "카오스 게이트", "시블링" 등) 를 그대로
  사용. 번역 금지.

## REST 계약

- Fastify route schema (`schema: { response, body, querystring, params }`) 가
  Swagger UI / `openapi.yaml` dump 의 단일 원천.
- 라우트 추가/수정 시 `yarn workspace @lostark/rest-api dump:openapi` 로
  `docs/contracts/` 산출물 갱신.
- Breaking change 는 [agent-team-protocol](./agent-team-protocol.md) §6 파괴적
  조작 게이트 대상이며, ADR 로 기록 + LoA-Bot 등 다운스트림에 사전 공지.

## 관련

- [yarn-berry-pnp](./yarn-berry-pnp.md) — PnP 운용 + 함정.
- [monorepo-workflow](./monorepo-workflow.md) — 모노레포 작업 단위 규약.
- [verification-strategies](./verification-strategies.md) — 검증 사다리 + 의무
  레벨.
- [documentation-guidelines](./documentation-guidelines.md) — 문서 작성 규칙.
