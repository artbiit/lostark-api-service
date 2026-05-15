---
summary: "tests/api/ 디렉토리 부재 문제 정정 (옵션 b: 스크립트 경로 재지정)"
session: 20260515-151438
continued_from: 20260515-150550
---

# tests/api/ alias 결함 정정 (2026-05-15)

## 배경 및 문제

`tests/api/` 디렉토리는 실제로 존재하지 않으나, `package.json` 의 두 테스트 스크립트(`test:api`, `test:cache-flow`) 와 `tests/common/test-runner.ts` 의 glob 패턴이 여전히 이를 가리키고 있었다. 실제 자산은 `tests/integration/api/` 에 위치하고 있어, 이들 스크립트/패턴은 dead code 상태였다.

관련 문서 4개(`docs/development/verification-strategies.md`, `docs/contracts/upstream-lostark-api/README.md`, `docs/contracts/upstream-lostark-api/V9.0.0/implementation-guide.md`, `tests/integration/api/README.md`) 도 부재 경로 인용으로 혼동을 야기했다.

**선택된 해결책**: 옵션 (b) — 스크립트 경로를 실제 자산 위치로 정정.

## 수정 변경점

### L1: 스크립트 실행 경로 정정

| 파일 | 라인 | 변경 |
|---|---|---|
| `package.json` | L25-26 | `tests/api/**` → `tests/integration/api/**`, cache-flow 타겟을 `simple-cache-flow-test.mjs` 로 정정 |
| `tests/common/test-runner.ts` | L138 | glob 패턴 `tests/api/**/*.test.ts` → `tests/integration/api/**/*.test.ts` |

### L2: 문서 경로 인용 정정

| 파일 | 라인 | 변경 |
|---|---|---|
| `docs/development/verification-strategies.md` | L20, L150 | 결함 메모 제거, Open Items 두 항목 closed 처리 |
| `tests/integration/api/README.md` | L36, L39, L42 | 실행 경로 안내 정정 (3행) |
| `docs/contracts/upstream-lostark-api/README.md` | L52 | V10.0.0 재수집 경로 정정 → `tests/integration/api/lostark-api/V10.0.0/api.test.mjs` |
| `docs/contracts/upstream-lostark-api/V9.0.0/implementation-guide.md` | L575 | 테스트 구조 다이어그램 디렉토리 정정 → `tests/integration/api/lostark-api/V9.0.0/` |

## 영향 범위

- **런타임 동작 변경**: `yarn test:api`, `yarn test:cache-flow` 스크립트 실행 대상이 올바른 경로를 가리키게 됨.
- **테스트 적용 범위 확대**: `tests/common/test-runner.ts` 의 glob 패턴 정정으로 향후 `tests/integration/api/**/*.test.ts` 추가 파일이 자동 인식.
- **문서 혼동 해소**: 4개 문서가 모두 실재 경로를 가리키도록 갱신, 개발자 진입 시 명확한 안내 제공.

## 검증 결과

| 항목 | 결과 | 근거 |
|---|---|---|
| L1: 타입 검사, 단위 테스트, 빌드, 린트 | **pass** | `yarn typecheck`, `yarn test:unit`, `yarn build`, `yarn lint` 모두 exit 0 |
| L1: 모노레포 의존 검증 | **pass** | `yarn validate:monorepo` exit 0 (패키지 분리/의존 변경 없음) |
| L2: 계약 검증 (`yarn test:api`) | **pass** | `NODE_OPTIONS='--use-system-ca'` 환경에서 exit 0 (36/36 테스트 통과). 환경 메모: 시스템 CA 사용이 필요 (회사/로컬 corporate proxy 의 self-signed CA chain 때문) |
| L1: 선행 커밋 게이트 (`yarn precommit`) | **pass** | exit 0 (통합 테스트 제외 구성으로 L1 단계만 검증) |
| Grep 검증: 부재 경로 인용 제거 | **pass** | `grep -r "tests/api[^-/_a-z0-9]"` 결과 0건 (6개 파일 합산, verification-strategies.md L191 의 취소선 처리된 historic reference 제외) |

## 보안 검증

- **입력 검증**: 영향 없음 (스크립트 경로/glob 패턴 변경, route schema 변경 없음)
- **권한 검증**: 영향 없음
- **DB 보안**: 영향 없음 (MySQL 스키마 변경 없음)
- **비밀 값**: 영향 없음
- **외부 노출**: 영향 없음

## 관련 링크

- 선행 세션: `.claude/work-session/20260515-150550/handoff.md` — 옵션 (b) 채택 기록
- 요구사항 분석: `.claude/work-session/20260515-151438/requirements.md`
- 설계 및 영향 맵: `.claude/work-session/20260515-151438/design.md`
- 검증 상세: `.claude/work-session/20260515-151438/verification.md`
- 이슈 보충 기록: `docs/development/verification-strategies.md` (Open Items 항목 폐기)

## 환경 메모

현 macOS 개발 환경에서 `yarn test:api` / `yarn validate:full` 실행 시 다음 환경 변수가 필요:

```bash
NODE_OPTIONS='--use-system-ca' yarn test:api
```

원인: 회사/로컬 corporate proxy 의 self-signed CA chain. Node 22+ 옵션 `--use-system-ca` 로 시스템 keychain 의 CA 를 사용하면 해소. 근본적 해결은 SKIP_LIVE_API 토글 구현 (별도 후속 과제, verification-strategies.md Open Items 미완).
