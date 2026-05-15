# Verification Strategies Registry

`verification-advisor` (Phase 3 도입 후) 가 읽는 단일 레지스트리. 이 파일에
등록된 전략만 검증 대상이 된다. 전략 추가/수정 시 이 파일만 변경하면 에이전트
구조(tier) 는 건드릴 필요 없다. advisor 부재 시점(Phase 0~2)에는 orchestrator 가
본 문서를 직접 참조해 게이트를 운용한다.

본 문서는 [agent-team-protocol.md](./agent-team-protocol.md) 의 §9 확장 트리거
규약을 따른다.

## 검증 사다리 (L1 / L2 / L3 / L4)

이 프로젝트의 검증은 4단으로 나뉜다. 코드 변경의 성격에 따라 **적용할 최소 L
레벨** 이 결정된다.

| 레벨   | 대상                                | 대표 전략                                                                                                                                          | 신뢰 범위                                                                                         |
| ------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **L1** | 단위·회귀 + 워크스페이스 정합       | `yarn typecheck` + `yarn test:unit` + `yarn validate:monorepo`                                                                                     | "내가 고친 라인이 깨지지 않음" + "과거 버그가 재발하지 않음" + "패키지 의존/refs 가 일관"         |
| **L2** | 공식 로스트아크 API envelope 계약   | `yarn test:integration` (현재 `tests/integration/api/armories.test.ts`) — `developer-lostark.game.onstove.com` live 호출                           | "공식 API 의 응답 envelope·필드·V9 스키마가 우리 normalizer/타입과 정합"                          |
| **L3** | 3-tier 캐시 동선 + API key 인증 e2e | `yarn test:cache-flow` (정상 동작 — `tests/integration/api/simple-cache-flow-test.mjs` 실행) + `tests/integration/api/*-cache-flow-test.mjs`        | "메모리 → Redis → MySQL 데이터 이동, TTL 만료, MySQL 복원" 까지 실제로 돈다                       |
| **L4** | 배포 준비성                         | `deploy-advisor` (Phase 6 도입 후) 산출 — `yarn build` + `yarn workspace @lostark/rest-api dump:openapi` + `loa-platform` compose 의존 서비스 검증 | "멀티 패키지 docker 이미지 빌드 가능, OpenAPI dump 갱신, 의존 인프라(MySQL/Redis) 사전 기동 확인" |

**시점 주의**: 본 서비스는 공식 로스트아크 API 의 wrapper 본체다. 따라서 L2 의
"원격 계약" 은 _우리가 호출하는 업스트림(공식 API)_ 의 envelope 검증이다.
다운스트림(LoA-Bot 등) 이 우리의 REST 계약을 검증하는 일은 다운스트림 측의
책임이며 본 사다리에 포함하지 않는다.

### 변경 범주 → 적용 L 레벨 (의무)

| 변경 범주                                                                                                                                                          | 의무 레벨                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| 공식 API 응답 스키마/normalizer 수정 (`packages/data-service/src/normalizers/**`, `packages/data-service/src/clients/**`, `packages/shared/src/types/**` V7/V8/V9) | L1 + L2                            |
| 캐시 키/TTL/3-tier 동선 변경 (`packages/data-service/src/cache/**`)                                                                                                | L1 + L3                            |
| Fastify 라우트 추가/스키마 변경 (`packages/rest-service/src/routes/**`)                                                                                            | L1 + L2 + `dump:openapi` diff 확인 |
| 패키지 분리/의존 변경 (`package.json`, `tsconfig.json`, `tsconfig.base.json`, `packages/*/package.json`)                                                           | L1 (`validate:monorepo` 포함)      |
| 인프라 설정 (`Dockerfile`, `docker-compose.yml`, `.env.example`, `packages/shared/src/config/env.ts`)                                                              | L1 + L4 + 수동 스모크              |
| 순수 도메인/유틸 로직 (공식 API 미관여, 캐시 미관여)                                                                                                               | L1                                 |

**회귀 테스트 의무**: 버그 수정 커밋은 해당 버그를 재현하는 테스트를 같이
포함한다. revert 시 테스트가 실패하고, 수정 후엔 통과해야 한다. 기존
`tests/unit/**` 또는 `tests/integration/**` 의 적절한 위치에 추가.

### 실행 수단

- `yarn verify` → `yarn validate:full` 의 alias. L1 전체(`validate:monorepo` +
  전체 `test` + `build` + `lint`) 를 순차 실행. **`/task` 세션 종료 전 의무**.
- `yarn validate:full` 직접 호출도 동등.
- L2 만 별도 검증: `yarn test:integration`.
- L3 (캐시 동선 standalone scripts):
  `node tests/integration/api/simple-cache-flow-test.mjs` 등 직접 실행 (현재
  `node:test` 로 통합되지 않음).

### live API 토글 (전략으로 등록, 구현은 후속 phase)

L2 는 공식 로스트아크 API 에 실제 호출을 발생시킨다. CI/원격 차단 환경 또는 키
부재 환경에서는 우회 토글이 필요하다.

- 예약된 토글: `SKIP_LIVE_API=1`
- 동작 가설: 환경변수가 set 이면 L2 는 즉시 skip(=pass) 처리, 그렇지 않으면 정상
  호출.
- **현 상태**: 토글 자체는 구현되지 않음. 현재
  `tests/integration/api/armories.test.ts` 는 `LOSTARK_API_KEY` 부재 시 `env.ts`
  의 zod 검증에서 throw, 키 존재 + 캐릭터 미지정 시에만 graceful skip. 토글
  도입은 별도 phase/PR (`tests/common/test-utils.ts` + 가능하면
  `packages/shared/src/config/env.ts` 의 분기 추가) 로 처리.
- Phase 1 종료 시점에서 게이트 충족 여부: `SKIP_LIVE_API` 미구현 상태이므로
  게이트 “토글 동작 확인” 은 **유예**. open items 에 적시.

## 사용 규약

- `verification-advisor` (Phase 3 도입 후) 는 호출 시 변경 scope 를 받아
  매칭되는 전략만 실행한다.
- 전략 개수에 따라 tier 가 자동 결정된다:
  - 1개 → advisor 가 직접 실행 (tier 2)
  - 2개 이상 → `worker:` 필드가 있는 전략은 해당 worker spawn (tier 3), 나머지는
    advisor 순차 실행
- 현재 worker 계열은 등록돼 있지 않다. 도입 시
  [agent-team-protocol.md §9](./agent-team-protocol.md) 의 확장 트리거 참조.
- advisor 부재 시점(Phase 0~2)에는 orchestrator 가 본 표를 직접 매칭해 명령을
  실행한다.

## 전략

```yaml
strategies:
  # ── L1 ────────────────────────────────────────
  - id: typecheck
    cmd: yarn typecheck
    scope: all
    timeout_s: 240
    failure_severity: blocker

  - id: monorepo-deps
    cmd: yarn validate:monorepo
    scope:
      - package.json
      - tsconfig.base.json
      - packages/*/package.json
      - packages/*/tsconfig.json
      - scripts/validate-dependencies.mjs
      - scripts/validate-references.mjs
    timeout_s: 120
    failure_severity: blocker
    note:
      'validate:deps + validate:refs + typecheck 통합. 패키지 의존/project
      references 변경 시 의무.'

  - id: unit
    cmd: yarn test:unit
    scope:
      - packages/*/src/**
      - tests/unit/**
    timeout_s: 600
    failure_severity: blocker

  # ── L2 ────────────────────────────────────────
  - id: contract-lostark-api
    cmd: yarn test:integration
    scope:
      - packages/data-service/src/clients/**
      - packages/data-service/src/normalizers/**
      - packages/shared/src/types/**
      - tests/integration/api/**
    timeout_s: 120
    failure_severity: blocker
    preconditions:
      - 'LOSTARK_API_KEY 환경변수 set'
      - '테스트 캐릭터 (tests/common/test-utils.ts 가 제공) 존재'
      - '공식 API 도달 가능 (developer-lostark.game.onstove.com)'
    skip_when: 'SKIP_LIVE_API=1 (토글 미구현 — 후속 phase)'
    note: |
      공식 로스트아크 API 의 응답 envelope/필드/V9 스키마가 우리 normalizer/타입과 정합한지 검증.
      blocker 인 이유: 공식 API 가 응답을 바꿨는데 우리 타입이 안 맞으면 캐시 적재 단계에서 production 장애.
      macOS 환경에서 Node 22+ 가 시스템 keychain 의 corporate/self-signed CA chain 을 신뢰하지 않을 경우
      `TypeError: fetch failed (self-signed certificate in certificate chain)` 가 발생한다. 이때
      `NODE_OPTIONS='--use-system-ca'` 를 prefix 로 두고 재실행 (예: `NODE_OPTIONS='--use-system-ca' yarn test:integration`).
      SKIP_LIVE_API 토글 구현 전까지 유효한 workaround.

  # ── L3 ────────────────────────────────────────
  - id: cache-flow
    cmd: 'node tests/integration/api/simple-cache-flow-test.mjs'
    scope:
      - packages/data-service/src/cache/**
      - packages/data-service/src/services/**
    timeout_s: 300
    failure_severity: blocker
    preconditions:
      - 'Redis 기동 (CACHE_REDIS_URL)'
      - 'MySQL 기동 + 마이그레이션 완료'
      - 'LOSTARK_API_KEY 환경변수 set'
    note: |
      메모리 → Redis → MySQL 캐시 계층 이동, TTL 만료, MySQL 복원까지 검증.
      현재 standalone .mjs 스크립트로 분리되어 있으며 node:test 통합은 후속 과제.
      `package.json` 의 `test:cache-flow` 스크립트는 `node tests/integration/api/simple-cache-flow-test.mjs` 로 정정 완료 (2026-05-15).

  # ── 통합 ──────────────────────────────────────
  - id: verify-all
    cmd: yarn verify
    scope: all
    timeout_s: 1500
    failure_severity: blocker
    note: |
      yarn verify = yarn validate:full = validate:monorepo + (전체) test + build + lint.
      /task 세션 종료 전 의무 (CLAUDE.md / Husky pre-push 와 동등 수준).
      L2/L3 의 live 의존 전략은 통합 명령 안에서 LOSTARK_API_KEY 부재로 자동 skip 되거나 (현재) throw 되거나 (graceful skip 미구현 항목) 한다 — Open Items 참조.
```

## 필드 정의

| 필드                | 의미                                                     |
| ------------------- | -------------------------------------------------------- |
| `id`                | 전략 식별자 (unique)                                     |
| `cmd`               | 실행 명령                                                |
| `scope`             | glob. 이 패턴에 변경이 걸칠 때만 실행                    |
| `timeout_s`         | 초 단위 타임아웃                                         |
| `failure_severity`  | `blocker` (실패 시 전체 검증 실패) \| `warning` (기록만) |
| `preconditions`     | 실행 전제 (사람/CI 가 충족해야 함)                       |
| `skip_when`         | 자동 skip 조건 (환경변수/플래그)                         |
| `worker` (optional) | spawn 할 worker 이름. 미지정 시 advisor 직접 실행        |

## 확장 시

- 새 전략 추가: 위 YAML 블록에 항목 추가.
- Worker 분리가 필요한 수준 (독립 테스트 스위트 ≥ 2, 단일 스위트 런타임 > 300s,
  산출물 > 50MB): `worker:` 필드 붙이고 해당 worker 파일 신설 +
  `verification-advisor.md` 의 tools 에 `Agent` 추가.
- 기준은
  [agent-team-protocol.md §9 확장 트리거 레지스트리](./agent-team-protocol.md#9-확장-트리거-레지스트리).

## Open Items (Phase 1 시점)

- `SKIP_LIVE_API=1` 토글 코드 구현 — `tests/common/test-utils.ts` + 필요 시
  `packages/shared/src/config/env.ts` 분기. 별도 phase/PR.
- ~~`package.json` 의 `test:api`, `test:cache-flow` 스크립트가 부재
  디렉토리(`tests/api/**`) 를 가리킴.~~ **[CLOSED]** `tests/integration/api/**`
  경로로 정정 완료 (2026-05-15). 변경 파일: `package.json` L25-26 + `tests/common/test-runner.ts` L138.
- ~~L3 (`tests/integration/api/*-cache-flow-test.mjs`) 의 `node:test` 통합 또는
  단일 진입점(`yarn test:cache-flow`) 정합화.~~ **[CLOSED — 부분]** `yarn test:cache-flow` 진입점은
  `simple-cache-flow-test.mjs` 로 정합화 완료 (2026-05-15). `node:test` 통합은 별도 phase/PR.
- `verification-advisor` agent 도입 (Phase 3) 시 본 문서를 자동 매칭 입력으로
  사용.
