# lostark-remote-kakao

로스트아크 공식 Developer API (`developer-lostark.game.onstove.com`) 를
**Fastify 기반 HTTP 서비스로 래핑·캐싱·재노출** 하는 독립 백엔드. 하위
소비자(LoA-Bot Discord 봇, 웹 대시보드 등) 의 공용 업스트림 역할을 한다.

본 파일은 매 세션 진입 시 자동 로드되는 **권위 게이트** 다. 절차·튜토리얼·상세
컨벤션은 docs/ 의 단일 원천을 인용하고, 본 파일은 게이트(=어겨서는 안 되는 것)
와 진입점 링크만 둔다.

## 진입 시 먼저 읽기 (docs-first)

- [docs/index.md](./docs/index.md) — 카테고리 색인 → 관련 카테고리 `index.md` →
  구체 문서 순.
- [docs/development/index.md](./docs/development/index.md) — 개발 규칙·환경
  색인.

## 에이전트 팀 운영 (`/task` 명령)

- 명시 호출(`/task [요청]`) 시에만 Orchestrator + Advisor + Worker 3-tier 모드.
  자동 적용 아님.
- 권위 레퍼런스:
  [agent-team-protocol](./docs/development/agent-team-protocol.md) (호출 모델 /
  충돌 조정 / 모델 선택 루브릭 / 보고서 스키마 / 파괴적 조작 게이트).
- 에이전트 정의: `.claude/agents/*.md` (Phase 3 까지 도입: requirements /
  graphify-lookup / parallel-explorer / research / design / code-writer /
  implementation / verification / documentation / retrospective + 기존
  graph-refresh-checker).
- 검증 전략 레지스트리:
  [verification-strategies](./docs/development/verification-strategies.md). 코드
  변경 1줄 이상이면 세션 종료 전 `yarn verify` 통과 필수.
- 문서화 정책:
  [documentation-guidelines](./docs/development/documentation-guidelines.md),
  카테고리 분류:
  [document-category-classification](./docs/development/document-category-classification.md).

## 권위 게이트 (어겨서는 안 되는 것)

### 코딩 규칙 (요약)

상세는 [coding-standards](./docs/development/coding-standards.md). 핵심:

- ESM `.ts` 소스에서도 상대 import 는 `.js` 확장자 (NodeNext).
- 새 환경변수는 `packages/shared/src/config/env.ts` 의 zod 스키마에 **먼저**
  등록 후 사용.
- 도메인 코드(`packages/data-service/`, `packages/shared/`) 에 **Fastify 타입
  직접 참조 금지**. Fastify 는 `packages/rest-service/` 경계 내에서만.
- MySQL 은 `mysql2` 의 prepared statement / 파라미터 바인딩(`?`). 문자열 보간
  raw SQL 금지.
- 도메인 용어는 로스트아크 원어("각인", "카오스 게이트", "시블링" 등) 그대로.
  번역 금지.

### Husky hook / 검증

- `pre-commit` = `yarn precommit` (`validate:monorepo + test:unit + lint`).
  `pre-push` = `yarn prepush` (`validate:monorepo + test + build`).
- **`--no-verify` 등으로 hook 우회 금지.** hook 실패 시 근본 원인을 찾아 고친다.

### 모노레포 작업 단위

- 패키지 간 의존이 바뀌는 작업은 **`yarn validate:monorepo` 선행**.
- 디렉토리명/패키지명 매핑·신규 패키지 추가/제거 절차는
  [monorepo-workflow](./docs/development/monorepo-workflow.md).

### Yarn Berry (PnP) 함정

- `node_modules/` 가 없다 — `.pnp.cjs` 로 의존 해석. 의존 변경 시 `.pnp.cjs`
  diff 동시 커밋.
- `declare module 'fastify'` 모듈 증강이 PnP + tsc 에서 인식되지 않는 함정 등
  상세는 [yarn-berry-pnp](./docs/development/yarn-berry-pnp.md).

### 파괴적 조작 게이트

[agent-team-protocol §6](./docs/development/agent-team-protocol.md) 에 정의된
조작은 advisor/worker 가 직접 수행 금지. orchestrator 가 사용자 확인 후에만
실행. 본 레포에서 자주 마주치는 케이스:

- MySQL 스키마 마이그레이션 적용 (`yarn db:migrate` 의 운영 환경 실행)
- `yarn workspace @lostark/rest-api dump:openapi` 산출물의 외부 공개 게시
- 파일 ≥5 또는 디렉토리 통째 삭제, `git push --force`, `git reset --hard`,
  `--no-verify` 우회

## 운영 / 배포 진입점

- [docs/maintenance/deployment.md](./docs/maintenance/deployment.md) — 배포
  가이드 + **운영 게이트 절** (yarn workspace dump:openapi 흐름 + loa-platform
  compose 의존 서비스 사전 기동 + LoA-Bot generated 재생성 안내).
- [docs/maintenance/host-node-run.md](./docs/maintenance/host-node-run.md) —
  macOS 호스트에서 직접 실행 시.
- [docs/architecture/system-overview.md](./docs/architecture/system-overview.md)
  — 3-tier 캐시 / 패키지 구성 / 디렉토리 구조 / 레이어 규칙.
- [docs/development/guide.md](./docs/development/guide.md) — 개발 워크플로우 +
  명령어.
- [docs/development/configuration.md](./docs/development/configuration.md) —
  환경변수 상세.
- [docs/development/docker-setup.md](./docs/development/docker-setup.md) —
  개발용 Docker 세팅 (운영용은 `../loa-platform` 의 compose 가 담당).

## 구조 탐색 (graphify)

- 모듈 의존 지도/Fastify 라우트 토폴로지 파악은
  [docs/graph/index.md](./docs/graph/index.md) (메타) 부터 확인.
- staleness 의심 시 `graph-refresh-checker` 서브에이전트 호출 → 판정에 따라
  `/graphify` 재생성. 운용 규약은
  [documentation-guidelines.md 의 graphify 섹션](./docs/development/documentation-guidelines.md#graphify-산출물-관리-규칙).
- 권장 scope: `packages/*/src`, `docs/contracts`, 필요 시 `tests/`.

## 형제 레포

같은 부모 디렉터리(`stz/loa/`) 에 수평 배치:

- **`../LoA-Bot`** — Discord 봇. 본 서비스의 주요 소비자. `openapi-typescript`
  로 본 REST 계약을 직접 타입 생성. REST 계약 변경 시
  `../LoA-Bot/src/infra/lostark/generated.ts` 재생성 안내를 커밋 메시지에 명시.
- **`../loa-platform`** — 오케스트레이션 전용 레포. docker-compose + 공용 운영
  문서. 코드 없음. 운영 기동 전 의존 인프라(MySQL/Redis) 가 그쪽에서 떠 있어야
  한다.
