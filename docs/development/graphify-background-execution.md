---
title: Graphify 백그라운드 갱신 — 이 프로젝트 적용 근거
category: development
created_at: 2026-05-17
---

# Graphify 백그라운드 갱신

이 프로젝트에서 graphify graph 갱신을 세션 blocking 없이 background 에서 처리할
수 있는 이유와, 도입된 메커니즘을 기록한다.

## 도입 배경

세션 종료 시 graphify graph 가 stale 로 판정되면 `agent-team-protocol.md §9.1`
deviation 절차에 따라 AskUserQuestion 으로 사용자 승인을 받아야 했다. 이
구조에서는:

1. Deviation(B) 로 이월 → 다음 세션에서도 stale 판정
2. 다음 세션도 AskUserQuestion → 또 deviation(B) 선택
3. 매 세션 같은 질문이 반복되는 루프 발생

## 이 프로젝트에서 Background 가 가능한 이유

### Code-only 경로: LLM 불필요

graphify `--update` 모드는 변경 파일이 모두 코드(`.ts`, `.js` 등)이면 semantic
재추출(LLM 서브에이전트)을 건너뛰고 **AST 추출만 실행**한다.

```
code-only 변경  → AST 추출만 (수 초~수십 초, 토큰 비용 0)
docs/md 포함   → LLM 서브에이전트 필요 (수 분, 토큰 비용 발생)
```

### 이 프로젝트의 변경 파일 분포

| 스코프   | 경로 패턴                           | 파일 유형  |
| -------- | ----------------------------------- | ---------- |
| packages | `packages/data-service/src/**/*.ts` | TypeScript |
| packages | `packages/udp-service/src/**/*.ts`  | TypeScript |
| packages | `packages/shared/src/**/*.ts`       | TypeScript |
| tests    | `tests/**/*.ts`                     | TypeScript |

일반적인 기능 구현 세션에서는 **모든 변경 파일이 TypeScript** 이다. docs/md
변경은 문서화 세션에서만 발생하며, 그런 세션에서는 hook 이 code-only 부분만
처리하고 semantic 갱신은 여전히 수동으로 진행한다.

## 도입된 메커니즘

### 세션 시작 시 early `/graphify --update` (§2.2)

**동작 방식**:

1. 세션 시작 시 직전 세션의 deviation 이월 Open Item 확인
2. 이월된 scope 와 명령 식별
3. **즉시 `/graphify <scope> --update` 실행** (report.md 초기화와 동시에)
4. code-only 변경이면 AST만 실행 (LLM 불필요, ~1~2분)
5. graphify-lookup-advisor 호출 전에 완료 확인

**왜 이 방식인가 — graphify hook 불가 이유**:

graphify 내장 hook(`graphify hook install`)을 2026-05-17에 시도했으나 이
프로젝트 구조와 호환되지 않아 즉시 제거했다. 불호환 이유:

- graphify hook 은 소스 디렉토리 = 그래프 출력 디렉토리를 가정한다
  (`<scope>/graphify-out/graph.json`)
- 이 프로젝트는 소스(`packages/`, `tests/`)와 출력(`docs/graph/<scope>/`)이
  분리된 비표준 구조
- `_rebuild_code(Path('docs/graph/packages/'), ...)` 호출 시 소스 파일이 없어 0
  nodes/edges 로 기존 그래프를 덮어쓰는 문제 발생
- `_rebuild_code(Path('.'), ...)` 호출 시 root-level
  `./graphify-out/`(gitignored) 를 생성하고 docs/graph 스코프를 갱신하지 않음

## 프로토콜 연동

### SKILL.md §2.2 (세션 시작 시 이월 처리)

직전 세션에 deviation 이월 Open Item 이 있으면 세션 시작과 동시에
`/graphify <scope> --update` 실행. code-only 이면 ~1~2분 완료.

### agent-team-protocol §9.1 분기

code-only 변경 → deviation(B) 허용 + 보고서에 다음 세션 명령 기록. docs/md 포함
→ (A) 즉시 재생성 권장.

### SKILL.md §9 종료조건 #4

partial-stale + code-only → deviation(B) 로 이월 허용. Open Items 에 명령 기록.

## 적용 범위 한계

- **docs/md/image 가 포함된 세션**: semantic 재추출(LLM) 필요. deviation 이월 시
  다음 세션 부담이 남으므로 즉시 재생성 권장.
- **code-only 대형 변경 (신규 파일 다수)**: --update 가 아닌 full rebuild 필요
  여부 graph-refresh-checker 판정에 따름.
- **타 프로젝트 적용**: graphify hook 은 소스=출력 단일 구조에서만 동작. 이
  프로젝트 처럼 소스/출력 분리 구조에서는 hook 불가.

## 관련 문서

- [agent-team-protocol.md §9.1](./agent-team-protocol.md)
- [SKILL.md §2.2, §9 종료조건 #4](../../.claude/skills/task/SKILL.md)
