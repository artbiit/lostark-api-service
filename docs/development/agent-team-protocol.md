# Agent Team Protocol

이 프로젝트의 Claude Code 세션은 **단일 오케스트레이터 + 도메인 어드바이저 + 필요 시 워커** 3-tier 구조로 작업한다. 본 문서는 행동 규약·호출 경로·보고서 스키마·확장 트리거의 **권위있는 레퍼런스**다. 에이전트 정의 파일(`.claude/agents/*.md`) 은 이 문서를 준수한다.

## 1. 역할 정의

### Orchestrator (메인 에이전트)

- 사용자와의 유일한 대화 창구.
- **직접 작업을 수행하지 않는다.** 조사/설계/구현/검증/문서화는 모두 advisor 에게 위임한다.
- 역할:
  1. 요청 해석 → 어떤 advisor 를 어떤 순서로 호출할지 결정
  2. 각 호출에 대한 **스케일 평가** + 모델 선택 (§5)
  3. advisor 간 충돌 중재 (§4)
  4. 공유 상태(`.claude/work-session/<sid>/`) 관리 + 보고서 누적
  5. 파괴적 조작 게이트 (§6) 통과 확인
  6. 사용자에게 최종 보고
- **예외적으로 직접 수행이 허용되는 것**: 공유 상태 파일 갱신, 사용자 질의, 타이트한 오타/URL/한 줄 수정 같은 마이크로 편집, 메타 작업(회고 결과를 MEMORY.md 에 반영).

### Advisor (도메인 팀장)

- 각 도메인의 단일 책임자. 해당 도메인 내부에서는 자기 권한으로 판단·작성.
- 2-tier advisor: 자기 tools 로 단일 invocation 에서 완결.
- 3-tier advisor (`research-advisor`, `implementation-advisor`): 내부에서 worker 를 병렬 spawn 가능.
- 산출물: **파일** (공유 상태 디렉토리 경로) + **요약 리포트** (orchestrator 반환값).

### Worker (실무자)

- 단일 책임·최소 컨텍스트.
- Advisor 가 조립한 프롬프트를 받아 1 task 수행 후 결과 반환.
- Worker 는 다른 worker 를 호출하지 않는다.

## 2. 호출 모델 (Hybrid)

```
Orchestrator
  ├── Tier-2 Advisor ──(단일 호출로 완결)──> 산출물 경로 + 요약 반환
  └── Tier-3 Advisor
        ├── Worker A (병렬) ─┐
        ├── Worker B (병렬) ─┼── Advisor 취합 ──> 산출물 경로 + 요약 반환
        └── Worker C (병렬) ─┘
```

- **Tier-3 advisor 만 tools 에 `Agent` 포함.**
- Worker 는 `Agent` 툴을 갖지 않는다 (재귀 금지).
- 한 Advisor 호출당 Worker 는 **최대 6개** 까지 동시 spawn (초과 시 advisor 가 배치 분할).

## 3. 도메인 매핑

| 도메인 | 에이전트 | Tier | 호출 시점 |
|---|---|---|---|
| 요구사항 파악 | `requirements-advisor` | 2 | 세션 초반, 스코프 모호 시 |
| 그래피파이 검색 | `graphify-lookup-advisor` | 2 | 모든 조사 요청의 1차 진입점 |
| 자료 검색 | `research-advisor` | 3 | graphify 에서 miss 또는 외부 자료 필요 시 |
| 설계 | `design-advisor` | 2 | 요구사항 확정 후, 구현 전 |
| 구현 | `implementation-advisor` | 3 | 설계 승인 후 |
| 검증 | `verification-advisor` | 2 | 구현 완료 후 (구현 경로·diff 접근 차단) |
| 문서화 | `documentation-advisor` | 2 | 작업 중/완료 시 |
| 문서화 (스킵 시) | (orchestrator 직접) | — | documentation-advisor 호출이 과한 단발 작업이지만 backlog/spec 문서에 phase 완료 마커가 있다면, orchestrator 가 1~2줄 인라인 갱신(completed_at + 커밋 해시)을 마이크로 편집 예외로 직접 수행. backlog 드리프트 방지. (MEMORY: feedback-backlog-phase-completion-inline-update) |
| 그래피파이 갱신 | `graphify-update-advisor` | 2 | **대규모** 변경 직후 (신규/수정 파일 > 5 또는 디렉토리 구조 변경·폐기). 소규모 code-only 갱신(≤5 파일)은 orchestrator 가 `/graphify <scope>` 직접 실행 + 메타 갱신 (MEMORY: feedback-graphify-update-advisor-tool-gap) |
| 배포 판정 | `deploy-advisor` | 2 | verification 통과 후, push 직후 (코드 변경 시 필수) |
| 회고 | `retrospective-advisor` | 2 | 세션 종료 직전 |

기존 `graph-refresh-checker` 는 유지. `graphify-update-advisor` 가 선행 호출한다.

> **이식 단계 주의**: 이 레포는 LoA-Bot 의 에이전트 팀 인프라를 단계적으로 이식 중이다 (`docs/work-log/2026-05-15-remote-kakao-infra-handoff/` Phase 0~6). 본 표의 advisor 중 일부는 아직 `.claude/agents/` 에 존재하지 않을 수 있다. Phase 진행 상태에 따라 호출 가능 advisor 가 달라지며, 부재한 advisor 는 orchestrator 가 직접 처리하거나 사용자에게 phase 진행 필요성을 안내한다.

## 4. 충돌 조정 프로토콜

1. 각 advisor 산출물 프론트매터에 `concerns: []` 필드를 둔다. 자기 도메인 바깥에 영향을 주는 결정은 반드시 여기 기록.
2. Orchestrator 는 모든 advisor 산출물을 수집한 뒤 `concerns` 을 교차해 충돌을 탐지한다.
3. 충돌 감지 시:
   - **2자 충돌**: 두 advisor 에게 서로의 `concerns` 블록만 전달해 1라운드 재검토 요청. 합의 → 종결. 실패 시 4로.
   - **N자 충돌 (3자 이상)**: orchestrator 가 공동 브리핑을 만들어 관련 advisor 들에게 동시에 전달, 1라운드. 실패 시 4로.
4. 1라운드 실패 시 orchestrator 가 근거·대립지점 요약 → **사용자에게 `AskUserQuestion`**. 판단 위임 후 확정.

### 4.1 AskUserQuestion 옵션 설계 규약

사용자에게 판단을 위임하는 `AskUserQuestion` 은 옵션 설계 품질이 마찰/라운드 수를 좌우한다. 다음 규약을 지킨다.

1. **결정 축 명시**: 옵션 열거 전에 해당 질문이 묻는 축(axis) 을 한 줄로 기술한다. 예: "신규 native dep 도입 여부", "결과를 스트리밍 vs 단건 공개".
2. **축 커버 자기검증**: Option A/B/C 가 축의 양 극단과 중간을 덮는지 스스로 점검. 한쪽 편향이면 재설계 후 제시.
3. **의존성 선스캔**: 외부 라이브러리(native/binary/네트워크) 도입이 섞인 옵션을 제시하려는 경우, 사전에 `package.json` 의 dependencies/devDependencies 를 훑어 기존 대체재가 있는지 확인한다. 있다면 "신규 dep 0 경로" 를 Recommended 또는 Option 에 포함. 이미지/압축/암호/HTTP 계열은 중복 의존성이 잘 생기는 영역이라 특히 주의.
4. **탈출구**: 마지막 옵션으로 "Other/직접 기술" 탈출구를 제공하거나, Recommended 이유를 명시해 사용자가 축을 무시하고 새 방향을 내도 되게 한다.

#### 자가 점검 항목

옵션 제시 전 다음 항목을 수행했는지 점검한다:

1. **의존성 선스캔 완료 확인**: 옵션에 외부 dep 도입이 있으면 package.json 스캔 결과를 옵션 설명에 인용.
2. **축 커버 검증 확인**: A/B/C 가 양극+중간 커버하는지 제시 전에 자가 점검 기록.
3. **Recommended 근거 명시**: 사용자가 읽지 않아도 선택 가능한 수준의 한 줄 이유.
4. **사용자 명시 언급 자료 포함 확인**: 이번 대화에서 사용자가 직접 URL/라이브러리/도구를 언급했다면 그 선택지를 옵션에서 빼지 말고 동등 비교 포함 또는 옵션 본문에 배제 근거 한 줄 기술 (MEMORY: feedback-user-mentioned-lib-must-appear-in-options).

### 4.2 clarify 요청 응대 분기

사용자의 clarify 요청은 두 갈래로 해석한다.

- **(a) 내용 clarify** ("A가 무슨 뜻?", "B는 어떤 동작?"): 옵션 의미를 재설명한다.
- **(b) 범위/축 clarify** ("옵션이 좁다", "다른 방향 없나", "이런 거 말고"): 옵션 자체를 다시 설계해 AskUserQuestion 을 한 번 더 보낸다.

(b) 로 판정되면 "무엇을 더 설명할까?" 로 되묻지 않는다. 설계 부담은 orchestrator 가 진다. (b) 신호 어휘가 섞였는지 먼저 판단하고 분기하는 것이 기본값.

## 5. 스케일 기반 모델 선택

에이전트 frontmatter 의 `model:` 필드는 **비워둔다.** Orchestrator 가 호출 시점에 Agent 툴의 `model` 파라미터로 override 한다.

### 루브릭

| 스케일 | 조건 (OR) | 모델 |
|---|---|---|
| small | 파일 ≤ 1, rote 실행, 응답 짧음, 실수 비용 낮음 | `haiku` |
| medium (기본값) | 파일 2–10, 단순 구현/조사 | `sonnet` |
| large | 멀티 도메인 설계, 충돌 조정, DB 마이그레이션/보안, 보고서 합의 | `opus` |

### 기록

모든 호출은 보고서 `invocations[].model_choice` 에 다음을 남긴다:

```yaml
model_choice:
  model: <haiku|sonnet|opus>
  scale: <small|medium|large>
  rationale: <한 줄>
```

**기본 지침**: 불확실하면 sonnet 에서 시작. 재호출 시 upgrade. 비용 하한선 유지.

## 6. 파괴적 조작 게이트

다음 조작은 advisor/worker 가 **직접 수행 금지**. Orchestrator 가 사용자 확인 후에만 실행한다.

- `git push --force`, `git reset --hard`, 브랜치/태그 삭제
- DB drop, TRUNCATE, MySQL 스키마 마이그레이션 적용 (작성은 허용, 적용은 금지)
- 파일 대량 삭제 (≥5 파일 또는 디렉토리 통째)
- 외부로의 메시지 발송 / 외부 API 쓰기 계열 호출 (공식 로스트아크 API 는 읽기 전용이라 해당 없음 — 그 외 third-party 쓰기 / 게시 행위가 게이트 대상)
- `~/.claude/` 전역 설정 수정 (프로젝트 설정은 허용)
- 서드파티에 데이터 업로드 (gist, pastebin 등)
- OpenAPI dump 결과를 외부에 공개 게시하거나 LoA-Bot 등 다운스트림 컨슈머의 generated 타입을 임의 재생성

일반적인 `git commit && git push` 는 stz/loa/* 레포의 작업 단위 완료 시 auto-commit 원칙 적용 (CLAUDE.md 참조).

## 7. 공유 상태 레이아웃

```
.claude/work-session/<sid>/
├── report.md              # §8 스키마
├── requirements.md        # requirements-advisor 산출
├── research/              # research-advisor 산출 (탐색 결과 묶음)
├── design.md              # design-advisor 산출
├── implementation/        # implementation-advisor 산출 (파일 소유권 맵 + 변경 로그)
├── verification.md        # verification-advisor 산출
├── documentation.md       # documentation-advisor 산출
├── conflicts.md           # advisor 간 충돌 기록
└── artifacts/             # worker 중간 산출물
```

`sid` = ISO 타임스탬프 `YYYYMMDD-HHMMSS`. 세션 시작 시 orchestrator 가 디렉토리 생성.

### 세션 핸드오프 (미래 확장 예약)

장기 세션이 컨텍스트를 초과할 경우 `.claude/work-session/<sid>/handoff.md` 에 다음 세션 인수인계 내용을 기록한다. 포맷:

```yaml
---
continued_from_sid: <prev-sid>
outstanding_decisions: []
pending_invocations: []
blocked_on: <기다리는 것>
---
```

현재는 포맷만 예약. 실제 사용은 필요 시.

## 8. 보고서 스키마 (v1)

```yaml
---
schema_version: 1
session_id: <sid>
resumed_from: <이전 sid | null>   # 동일 sid 디렉토리가 이미 있어 새 sid 로 시작한 경우
started_at: <iso>
ended_at: <iso | null>
user_request: |
  <원문>
---

# Summary
<1-3 문단>

# Invocations
# 시간순. orchestrator 도 자기 주요 판단을 invocation 으로 기록.
- id: inv-001
  layer: orchestrator | advisor | worker
  name: <agent name>
  agent_version: <frontmatter version>
  parent_invocation_id: <id | null>
  started_at / ended_at: <iso>
  input_digest: <요약 1줄>
  output_digest: <요약 1줄>
  artifacts: [path1, path2]
  concerns: []
  model_choice:
    model: <...>
    scale: <...>
    rationale: <...>
  token_usage:                 # 추정치 가능
    input: <n>
    output: <n>

# Decisions
- by: <advisor name | user>
  at: <iso>
  decision: <...>
  rationale: <...>
  related_invocations: [inv-00X]

# Conflicts
- between: [advisor A, advisor B, ...]
  detected_at: <iso>
  resolved_by: mediation | orchestrator | user
  outcome: <...>

# Open Items
- <...>

# User Signals (옵셔널, 세션 중 orchestrator 가 누적)
# 사용자 발화에서 감지된 긍정/부정 시그널. retrospective-advisor 입력.
user_signals:
  positive:
    - quote_or_paraphrase: <사용자 발화 한 줄>
      about: <어떤 결정/행동에 대한 것인지>
  negative:
    - quote_or_paraphrase: <사용자 발화 한 줄>
      about: <어떤 결정/행동에 대한 것인지>
      structural: true | false

# Retrospective
- signals: { positive: [], negative: [] }   # retro 가 user_signals 를 구조화해 옮김
- what_went_well: []
- what_to_improve: []
- memory_candidates: []       # { name, type, description, body_draft, rationale_for_saving, signal_source, docs_sync_target }
                              # docs_sync_target: 운영·배포·검증 규약성이면 반영해야 할 docs 경로 또는 null
- protocol_feedback: []       # structural 부정 시그널 기반
- applied_changes: []         # MEMORY / SKILL / agent 수정 목록
```

### 진화 규칙

- 필드 추가는 backward-compatible 유지 (옵셔널로 시작).
- 필드 의미 변경·제거는 `schema_version` 올림.
- 기존 세션의 보고서는 소급 수정하지 않는다.

## 9. 확장 트리거 레지스트리

**사후 승격 원칙.** 아래 신호가 관측되면 해당 에이전트/워커를 추가한다. 예측만으로 미리 만들지 않는다.

| 트리거 | 추가 대상 | 행동 |
|---|---|---|
| 독립 테스트 스위트 ≥ 2 or 단일 스위트 런타임 > 300s or 산출물 > 50MB | `verification-advisor` → tier 3 승격 + 필요 worker(`unit-test-runner` / `integration-test-runner` / `cache-flow-runner` 등) | 해당 worker 파일 추가 + advisor tools 에 `Agent` 추가 + `verification-strategies.md` 등록 |
| 설계 검수 요구 정례화 | `design-reviewer` worker | design-advisor tier 3 승격 |
| 문서 링크 깨짐 빈발 or 다중 카테고리 동시 작성 정례화 | `doc-linter` worker, `doc-writer` worker | documentation-advisor tier 3 승격 |
| graph scope ≥ 5 | lookup 병렬 worker | graphify-lookup-advisor tier 3 승격 |
| scope ≥ 3 재생성이 정례화 | `scope-regen` worker | graphify-update-advisor tier 3 승격 |
| 세션 ≥ 10 누적 후 장기 패턴 분석 요구 | `retro-aggregator` advisor 또는 worker | 별도 ADR 고려 |

## 10. MCP / 외부 도구 통합 규칙

- MCP 서버 추가는 `~/.claude/settings.json` 또는 `.claude/settings.json` 의 harness 설정 사항이다.
- 새 MCP 툴이 등록되면 **관련 advisor 의 `tools:` 배열을 확장**한다. 구조(tier) 변경은 발생하지 않는다.
- Worker 는 MCP 툴을 원칙적으로 받지 않는다 (격리 유지). 예외는 ADR 로 기록.

## 11. Agent 파일 규약

모든 `.claude/agents/*.md` 는 다음 frontmatter 를 따른다:

```yaml
---
name: <kebab-case>
description: <orchestrator 가 호출 판단에 쓰는 한 줄>
tools: <쉼표 구분 목록>        # 필요한 것만 최소
version: 1
# concerns_checked: true — 산출물 frontmatter 에 필수. agent 정의 frontmatter 에는 불필요.
---
```

`model:` 필드는 넣지 않는다 (orchestrator 오버라이드). 프롬프트 본문에는 반드시 다음 섹션을 포함:

1. **역할** — 이 도메인에서 책임 범위
2. **입력** — orchestrator 가 무엇을 주는지
3. **도구 사용 규칙** — 어떤 도구를 어느 범위로 쓸지
4. **출력 스키마** — 반환값 형식 (파일 경로 + 요약 리포트)
5. **금기** — 인접 도메인 침범 금지 사항
6. **충돌 시** — `concerns` 필드 사용법
7. **자가 검증** — 반환 직전 체크리스트 (§12)

## 12. Advisor 산출물 자가 검증

모든 advisor 는 산출물을 orchestrator 에 반환하기 **직전에** 다음 3개 항목을 점검한다.

| # | 항목 | 실패 시 행동 |
|---|---|---|
| 1 | 산출물 파일이 `.claude/work-session/<sid>/` 에 존재 | 즉시 작성 후 재확인 |
| 2 | frontmatter 필수 필드 (phase, agent, agent_version, generated_at, concerns, concerns_checked) 포함 | 누락 필드 추가 |
| 3 | concerns 를 의도적으로 검토 완료 (비어있어도 OK, 검토 사실 자체가 핵심) | concerns_checked: true 삽입 |

자가 검증 결과는 반환값의 `self_verification` 에 포함한다:

```yaml
self_verification:
  checklist_passed: true   # 또는 false + failed_items
```

Worker 는 산출물을 advisor 에 반환하므로 파일 존재 기준이 다르다: worker 는 자신이 수정/생성한 파일 경로를 반환값에 포함하면 통과.

## 13. 회고 → MEMORY 반영 절차

1. `retrospective-advisor` 가 세션 보고서를 읽고 `what_to_improve` / `applied_changes` 초안을 산출.
2. Orchestrator 가 그 중 **메모리에 남길 만한 항목** (재현성 있는 교훈) 만 선별.
3. `~/.claude/projects/…/memory/` 에 신규 파일 또는 기존 파일 갱신, `MEMORY.md` 인덱스 갱신. 본 레포 첫 채택 시 디렉토리가 부재할 수 있으며, 첫 회고 시점에 자동 생성된다.
4. 사용자 확인 없이 진행 (auto-recommended 정책). 단 파괴적 삭제가 아닌 **추가/수정** 만 허용.

## 관련 문서

- [verification-strategies.md](./verification-strategies.md) — verification-advisor 가 읽는 전략 레지스트리 (Phase 1 도입 후)
- [documentation-guidelines.md](./documentation-guidelines.md) — 문서 작성 규칙 (Phase 2 도입 후)
- [document-category-classification.md](./document-category-classification.md) — 카테고리 분류 기준 (Phase 2 도입 후)
- §12 Advisor 산출물 자가 검증 체크리스트
