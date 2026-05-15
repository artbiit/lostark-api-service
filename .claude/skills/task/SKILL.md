---
name: task
description: 에이전트 팀(Orchestrator + Advisor + Worker) 모드로 진입해 요청을 처리. 자동 적용되지 않고 사용자가 명시적으로 `/task [요청]` 으로 호출해야 진입한다.
trigger: /task
---

# /task

이 명령이 호출되면 메인 에이전트는 **Orchestrator** 역할로 전환된다. 이 역할 규약은 `docs/development/agent-team-protocol.md` 를 권위 레퍼런스로 한다.

## 사용법

```
/task                  # 인자 없음 — 사용자 요청 본문을 이 세션의 직전 메시지에서 수렴
/task <요청 본문>      # 인자로 작업 요청을 바로 전달
/task <feedback slug>  # feedback inbox 의 특정 항목을 시작점으로
```

## Orchestrator 진입 절차

### 1. 프로토콜 로드

반드시 다음 문서를 **전문 읽기** 하여 세션 컨텍스트에 주입:

- `docs/development/agent-team-protocol.md` — 호출 모델 / 충돌 조정 / 스케일 루브릭 / 보고서 스키마 v1 / 파괴적 조작 게이트 / 확장 트리거

그 외 참조가 필요할 수 있는 문서 (Read 는 필요 시):

- `docs/development/verification-strategies.md` (Phase 1 도입 후)
- `docs/index.md` (docs-first)
- `docs/feedback/index.md` (feedback slug 입력 시)

> 본 레포의 이식 진행 단계상 일부 advisor / 가이드라인이 아직 부재할 수 있다. Phase 0 직후 시점에는 advisor 호출이 불가능하므로 orchestrator 가 직접 처리하거나 사용자에게 phase 진행 필요성을 안내한다 (`docs/work-log/2026-05-15-remote-kakao-infra-handoff/` 의 phases 참고).

### 2. 공유 상태 디렉토리 생성

```
.claude/work-session/<sid>/
```

`sid` = `YYYYMMDD-HHMMSS` (KST). Orchestrator 가 Bash 로 생성:

```bash
mkdir -p .claude/work-session/<sid>/{research,implementation,artifacts}
```

**재개 규약**: 동일 sid 디렉토리가 이미 존재하면 이어쓰지 않고 새 sid 로 시작하되 `report.md` 에 `resumed_from: <이전 sid>` 필드를 기록한다. 이전 보고서의 미완료 섹션은 링크만 남기고 이번 세션에서 재수행.

#### 2.1. Advisor Invocation Decision Log 초기화

`report.md` 생성 직후 다음 섹션을 추가:

```yaml
# Advisor Invocation Decision Log
# 각 advisor 호출/스킵 판단 즉시 1줄 append
```

이후 각 advisor 에 대해 호출/스킵 결정 시점에 즉시 다음 형식으로 append:

```yaml
- advisor: <name>
  decision: call | skip
  rationale: "<판단 근거 1줄>"
  checked_at: <iso>
```

### 3. report.md 초기화

해당 디렉토리에 `report.md` 를 프로토콜 §8 스키마 v1 로 생성. 최초엔 헤더 + `user_request` + `Invocations: []` 만.

### 4. 요청 해석

- 인자 있음 → 인자 텍스트를 `user_request` 로
- 인자 없음 → 사용자 직전 메시지 또는 명시 요청 수렴
- feedback slug → `docs/feedback/inbox/<slug>*.md` 탐색 → frontmatter `status: open` → `in_progress` 로 갱신 + 본문을 `user_request` 로

### 5. Advisor 호출 계획 수립

원 요청을 훑고 어떤 advisor 를 어떤 순서로 호출할지 결정한다. 일반적 흐름 (생략 가능):

```
requirements-advisor
  → graphify-lookup-advisor → (miss 시) research-advisor
  → design-advisor
  → implementation-advisor
  → verification-advisor
  → documentation-advisor
  → (코드 변경 시) graph-refresh-checker → (stale 시) graphify-update-advisor
  → retrospective-advisor
```

**스킵 기준 (정량)**:

| 조건 | 정량 기준 | 판정 |
|---|---|---|
| 마이크로 편집 | 단일 파일 + 변경 ≤10줄 + 신규 로직 없음 (오타/값 교체/URL/설정값) | advisor 전체 스킵 + orchestrator 직접 |
| 요구 명확 (requirements 스킵) | 구체적 수치·범위·결과물 형태 명시 + 탐색적 표현 부재 + 기존 문서로 스코프 완전 파악 | requirements-advisor 스킵 |
| 설계 충분 (impl-advisor 스킵) | 파일 영향 맵 전 행 + TypeScript/YAML 계약 + 실행 순서(Phase) 명시 | implementation-advisor 스킵 |
| Research 불필요 | graphify-lookup hit + 기존 docs 커버 + 외부 API/lib 조사 불필요 | research-advisor 스킵 |

**탐색적 표현 스킵 금지**: "~해보자", "어떻게 할 수 있을까", "방법이 있을까", "구성해보자", "생각해보자" 같은 표현이 포함되면 범위 미확정이므로 requirements 스킵 불가.

**graphify-lookup 필수 선행 규칙**:

- **research-advisor 호출 전에 graphify-lookup-advisor 를 반드시 먼저 호출한다.** 프로토콜 §3 "모든 조사 요청의 1차 진입점". graph 에서 miss 판정을 받은 뒤에만 research-advisor 로 넘어간다.
- graphify-lookup 스킵 면제 조건은 없다. `no-graph` / `stale-suspected` 판정이더라도 호출 자체는 수행하고 판정 결과를 보고서에 기록한다.
- research 자체가 불필요한 경우(마이크로 편집, 기존 문서 충분)만 graphify-lookup 도 함께 스킵된다.

**스킵 불가 (항상 실행)**:

- **verification-advisor / `yarn validate:full`** — 코드 변경이 1줄이라도 있으면 반드시 세션 종료 전에 통과해야 한다. 마이크로 편집이라도 예외 없음.
- **버그 수정 시 회귀 테스트** — 수정 전에는 실패하고 수정 후엔 통과하는 테스트를 같은 커밋에 포함. `verification-strategies.md` 의 "버그 범주 → 적용 L 레벨" 표 준수 (Phase 1 도입 후).

**Worker 계층**: 파일 단위 분할·동시 수정 방지·파일 소유권 맵은 `implementation-advisor` 책임. 상세는 프로토콜 §7. SKILL 본문에서 반복하지 않음.

**병렬 호출**: 독립 advisor (예: `research-advisor` 내부 `parallel-explorer`) 는 병렬 실행이 기본. orchestrator 가 상위 advisor 여러 개를 동시 호출하는 것은 컨텍스트 오염 리스크로 기본 금지. 자세한 규약은 프로토콜 §2.

### 6. 각 호출에 모델 override

프로토콜 §5 루브릭으로 스케일 평가 후 Agent 툴 `model` 파라미터로 `haiku` / `sonnet` / `opus` 지정. 근거 한 줄을 `report.md` 의 `invocations[].model_choice.rationale` 에 기록.

### 7. 충돌 중재

advisor 산출물의 `concerns` 필드 교차 검사. 프로토콜 §4 절차 준수. 1라운드 실패 시 사용자에게 `AskUserQuestion`.

### 8. 파괴적 조작 게이트

프로토콜 §6 에 해당하는 조작은 orchestrator 가 사용자 확인 후에만 실행. Advisor/Worker 가 직접 수행 금지.

**게이트 통과 후 검증 실패 시 롤백**: 파괴적 조작이 사용자 승인 후 실행되었고 후속 검증이 실패하면 orchestrator 가 **즉시** 되돌리기를 시도한다 — `git revert`, 파일 복원, migration down 등. 자동 복원이 불가능한 영역(외부 서비스 상태 변경·OpenAPI 컨슈머에 영향이 가는 공개 dump 등) 이면 `needs_user_verification` 에 수동 복구 단계를 명시하고 세션을 닫지 않는다.

### 8. 중간 보고서 실시간 누적

**중간 보고서 실시간 누적**: 각 advisor 반환 즉시 `report.md` 의 `Invocations` / `Concerns` / `Decisions` 섹션에 append. Retrospective 호출 시점까지 미루지 않는다.

이를 통해 세션 중간에도 "지금까지 무슨 결정?" 질의에 report.md 링크로 즉답 가능.

### 9. 세션 종료

**종료 조건 (의무)**:

1. **`yarn validate:full` 통과** — L1 pass, L2 는 pass 또는 skip(공식 API 호출 미수행 / `SKIP_LIVE_API=1`). L2 실패 상태에서 세션 종료 금지.
2. 보고서의 "verified_by_me" 섹션에 실제로 통과한 단계를 나열:
   - `L1: typecheck / unit (+ 회귀)`
   - `L2: 공식 로스트아크 API envelope (pass | skipped:<reason>)`
   - 로그 스캔: `clean | warn:<n>건`
3. 보고서의 "needs_user_verification" 섹션에 사용자 손으로 해야 할 것 명시
   (예: 실제 운영 환경에서 `dump:openapi` 산출물을 LoA-Bot 의 `openapi-typescript` 재생성으로 흡수). 없으면 "(없음)".
4. **`graph-refresh-checker` 호출 + 판정 기반 처리** — 코드 변경이 1줄이라도 있으면 예외 없이 실행. 판정별 필수 후속:
   - `fresh` → 후속 없음. 보고서 "graph_refresh" 섹션에 `fresh` 기록.
   - `partial-stale` → 해당 scope 만 `/graphify <대상경로>` 재생성. `docs/graph/index.md` frontmatter + Scopes 표 갱신.
   - `fully-stale` → 영향 scope 전체 `/graphify` 재생성. 메타 갱신.
   - `no-graph` → 코드베이스가 비어있지 않다면 **세션 내에서 최초 생성**. `/graphify <주요 경로>` 실행 + 메타 작성.
   판정 결과와 수행한 처리는 보고서 "graph_refresh" 섹션에 한 줄 기록 (예: `partial-stale → packages/data-service/src 재생성 완료`).
5. **`git status` 확인** — 미커밋 잔여(tracked 변경·untracked 파일) 가 있으면 (1) 이번 작업 단위에 속하면 stz/loa auto-commit 정책에 따라 커밋/push, (2) 속하지 않으면 `report.md` 의 `open_items` 에 파일 경로·상태를 명시. 커밋되지 않은 잔여를 남긴 채 retrospective 로 넘어가지 않는다.
6. **`deploy-advisor` 호출 (Phase 6 도입 후)** — 코드 변경(`packages/*/src/`, `Dockerfile`, `docker-compose.yml`, `docker/`)이 1줄이라도 있으면 예외 없이 실행. 배포 계획을 산출하고 보고서 "deploy_plan" 섹션에 기록. haiku 모델로 호출. 산출된 `actions` 중 `yarn build` / `yarn workspace @lostark/rest-api dump:openapi` / loa-platform compose 재기동은 orchestrator 가 **사용자에게 안내하거나 직접 실행** (auto-commit 정책 준용). 배포 불필요 판정이면 `skippable_reason` 기록. **deploy-advisor 미도입 시점**(Phase 0~5)에서는 orchestrator 가 직접 동등 절차를 안내한다 — 최소: `yarn workspace @lostark/rest-api dump:openapi` 실행 후 OpenAPI diff 첨부, REST 계약이 바뀐 경우 `../LoA-Bot/src/infra/lostark/generated.ts` 재생성 안내.

그 외:
- **retro 호출 전 orchestrator 가 `user_signals` 기록**: 세션 중 사용자 발화에서 감지한 부정 시그널("왜 안 했어?", "또야?", "틀렸어") 과 긍정 시그널("좋더라", "그거 맞아", 한 번 만에 수락) 을 `report.md` 의 `user_signals.{positive|negative}` 에 한 줄씩 인용·요약. 구조적 허점이면 `negative[*].structural: true`. 한쪽이 없으면 빈 리스트.
- 모든 advisor 산출이 수렴 + verification pass 면 retrospective-advisor 호출 (기록된 `user_signals` 를 입력으로). **호출 전 전제**: `report.md` 의 `Summary` / `Invocations` / `Decisions` 세 섹션이 최소 1줄 이상 채워져 있어야 함. 빈 Summary 로 회고를 돌리면 입력 품질이 무너진다 (MEMORY `feedback_report_summary_fill_before_retrospective`).
- 회고 결과의 `memory_candidates` 검토 후 orchestrator 가 수용 여부 결정 → 수용 시 memory 갱신. `signal_source: negative` 뿐 아니라 `positive` 후보도 동등하게 검토 (비자명한 판단이 검증된 경우). 수용한 candidate 에 `docs_sync_target` 이 지정되어 있으면 해당 경로(CLAUDE.md / docs/development/\*.md / ADR 등) 에도 **같은 커밋에** 반영한다 (MEMORY `feedback_memory_docs_sync`).
- `report.md` 에 `ended_at` 기록
- feedback slug 로 진입했다면 해당 항목을 `archive/` 로 이동 + frontmatter `status: done`, `resolved_at`, `resolved_commit`, `work_log` 갱신
- 커밋/push 는 stz/loa/* 레포 auto-commit 정책에 따라 작업 단위 끝에서 진행

## 명시적 비활성 경로

사용자가 세션 도중 "팀 거치지 말고 직접 해", "advisor 없이", "간단히" 같은 지시를 내리면 orchestrator 는 advisor 호출을 스킵하고 직접 처리한다. `/task` 로 진입했더라도 예외 모드로 전환 가능.

## 금지

- `/task` 를 부르지 않았는데 팀 모드로 진입하는 것 (자동 적용 아님)
- 프로토콜 문서를 읽지 않고 팀 작업 시작
- `.claude/work-session/` 디렉토리 없이 보고서 누적

## 관련

- [docs/development/agent-team-protocol.md](../../../docs/development/agent-team-protocol.md)
- [docs/development/verification-strategies.md](../../../docs/development/verification-strategies.md) — Phase 1 도입 후 활성
