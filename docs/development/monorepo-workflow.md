# 모노레포 작업 단위 규약

본 레포는 `packages/*` (shared / data-service / rest-service / udp-service) 의
4-패키지 모노레포다. 패키지 경계가 컴파일·테스트·빌드 단위와 직결되므로, 패키지
간 의존이 변경되는 작업은 별도 검증 게이트를 거친다.

## 핵심 원칙

- **패키지 간 의존 변경 시 `yarn validate:monorepo` 선행**: 순환 참조 + project
  references 정합을 검증한다. 통과 후에만 commit.
- **PR/커밋은 패키지 단위가 아닌 "작업 단위"** 로. 같은 의도의 변경이 여러
  패키지에 걸치면 한 커밋에 묶는다 (e.g. data-service 의 normalizer 변경 +
  rest-service 라우트 schema 갱신 + shared 타입 추가).

## 작업 시작 전 체크리스트

1. `docs/index.md` → 관련 카테고리 → 구체 문서 순으로 docs-first 탐색.
2. 패키지 의존이 바뀌는 작업이면 `yarn validate:monorepo` 가 현재 통과하는지
   baseline 확인.
3. 변경 범주 → [verification-strategies](./verification-strategies.md) 의 의무 L
   레벨 확인.
4. 그래프 의존 지도 필요 시 `docs/graph/index.md` 메타 → `graph-refresh-checker`
   → `partial-stale`/`fully-stale` 이면 `/graphify` 재생성.

## 패키지 추가/제거

신규 패키지 추가:

1. `packages/<name>/package.json` 작성 (`@lostark/<name>` 네임스페이스).
2. 루트 `package.json` 의 `workspaces` 배열에 자동 포함됨 (`packages/*`
   와일드카드).
3. `tsconfig.base.json` 의 `references` 에 추가.
4. `scripts/validate-references.mjs` 가 인식하는지 `yarn validate:monorepo` 로
   확인.
5. `docs/architecture/index.md` 의 패키지 표 갱신.

패키지 제거:

1. 의존 받는 다른 패키지에서 import 0건 확인 (`grep -r "@lostark/<name>"`).
2. `tsconfig.base.json` references 에서 제거.
3. `packages/<name>/` 디렉토리 삭제.
4. `yarn validate:monorepo` 재실행.
5. `docs/graph/<scope>/` 산출물 삭제 (`graphify` 메타 갱신).

## 워크스페이스 명령 호출

- 단일 패키지: `yarn workspace @lostark/<name> <cmd>`. 디렉토리명과 패키지명이
  다른 두 케이스(`rest-service` ↔ `@lostark/rest-api`, `udp-service` ↔
  `@lostark/udp-gateway`) 를 항상 패키지명 기준으로.
- 전 워크스페이스: `yarn workspaces foreach -A run <cmd>` 또는 루트
  `package.json` 의 통합 스크립트(`yarn build`, `yarn typecheck`, `yarn lint`
  등).

## 디렉토리명 ↔ 패키지명 매핑

| 디렉토리                 | 패키지명                |
| ------------------------ | ----------------------- |
| `packages/shared/`       | `@lostark/shared`       |
| `packages/data-service/` | `@lostark/data-service` |
| `packages/rest-service/` | `@lostark/rest-api`     |
| `packages/udp-service/`  | `@lostark/udp-gateway`  |

불일치를 정정하지 않는 이유: 외부 의존(LoA-Bot 의 `openapi-typescript` 산출물
등) 이 패키지명을 직접 참조하므로 변경 비용이 크다. ADR 로 명시 정착 처리 권장
(현 단계에선 양쪽 명칭을 모두 인지하는 것으로 감내).

## 관련

- [yarn-berry-pnp](./yarn-berry-pnp.md) — PnP 운용.
- [coding-standards](./coding-standards.md) — 레이어 경계 + 코딩 규칙.
- [verification-strategies](./verification-strategies.md) — 변경 범주 → 의무 L
  레벨.
- [agent-team-protocol](./agent-team-protocol.md) — 파괴적 조작 게이트 (의존
  대량 변경 등).
