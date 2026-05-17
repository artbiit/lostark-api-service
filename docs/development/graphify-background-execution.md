---
title: Graphify 백그라운드 갱신 — 이 프로젝트 적용 근거
category: development
created_at: 2026-05-17
---

# Graphify 백그라운드 갱신

이 프로젝트에서 graphify graph 갱신을 세션 blocking 없이 background 에서 처리할 수
있는 이유와, 도입된 메커니즘을 기록한다.

## 도입 배경

세션 종료 시 graphify graph 가 stale 로 판정되면 `agent-team-protocol.md §9.1`
deviation 절차에 따라 AskUserQuestion 으로 사용자 승인을 받아야 했다. 이 구조에서는:

1. Deviation(B) 로 이월 → 다음 세션에서도 stale 판정
2. 다음 세션도 AskUserQuestion → 또 deviation(B) 선택
3. 매 세션 같은 질문이 반복되는 루프 발생

## 이 프로젝트에서 Background 가 가능한 이유

### Code-only 경로: LLM 불필요

graphify `--update` 모드는 변경 파일이 모두 코드(`.ts`, `.js` 등)이면
semantic 재추출(LLM 서브에이전트)을 건너뛰고 **AST 추출만 실행**한다.

```
code-only 변경  → AST 추출만 (수 초~수십 초, 토큰 비용 0)
docs/md 포함   → LLM 서브에이전트 필요 (수 분, 토큰 비용 발생)
```

### 이 프로젝트의 변경 파일 분포

| 스코프 | 경로 패턴 | 파일 유형 |
|--------|-----------|-----------|
| packages | `packages/data-service/src/**/*.ts` | TypeScript |
| packages | `packages/udp-service/src/**/*.ts` | TypeScript |
| packages | `packages/shared/src/**/*.ts` | TypeScript |
| tests | `tests/**/*.ts` | TypeScript |

일반적인 기능 구현 세션에서는 **모든 변경 파일이 TypeScript** 이다. docs/md 변경은
문서화 세션에서만 발생하며, 그런 세션에서는 hook 이 code-only 부분만 처리하고
semantic 갱신은 여전히 수동으로 진행한다.

## 도입된 메커니즘

### graphify git post-commit hook

**설치 일자**: 2026-05-17

```powershell
graphify hook install   # 설치
graphify hook status    # 확인
graphify hook uninstall # 제거
```

**동작 방식**:

1. 모든 `git commit` 직후 자동 실행
2. `git diff HEAD~1 HEAD` 로 변경 파일 감지
3. code-only → AST 재추출 + graph.json 재생성 (LLM 불필요)
4. `nohup ... & disown`: git commit 이 즉시 반환, graph 갱신은 완전 background
5. 로그: `~/.cache/graphify-rebuild.log`

**이 프로젝트의 graphify 출력 위치와 호환성**:

이 프로젝트는 graphify 산출물을 `docs/graph/<scope>/` 에 직접 쓴다. hook 은
project root 에서 `_rebuild_code(Path('.'), changed_paths=changed)` 를 호출하며,
`docs/graph/<scope>/` 내의 `.graphify_root` 마커 파일을 통해 각 스코프를
자동 탐색한다. 스코프 목록:

| 스코프 | 경로 |
|--------|------|
| packages | `docs/graph/packages/` |
| docs | `docs/graph/docs/` |
| legacy | `docs/graph/legacy/` |
| tests | `docs/graph/tests/` |

## 프로토콜 연동

### agent-team-protocol §9.1 예외 규칙

code-only 변경 + hook installed → deviation AskUserQuestion 생략. 보고서에
`hook: auto-pending` 기록.

### SKILL.md §2.2 (세션 시작 시 확인)

이전 세션에 deviation 이월 Open Item 이 있으면:
- hook installed → `graph-refresh-checker` 재호출로 현재 staleness 재판정
  (hook 이 이미 처리했으면 `fresh` 반환)
- hook not installed → 기존 §9.1 AskUserQuestion 절차

### SKILL.md §9 종료조건 #4

partial-stale + hook installed + code-only → 커밋 후 hook 에 위임. 추가 조작 불필요.

## 적용 범위 한계

- **docs/md/image 가 포함된 세션**: hook 이 code-only 만 처리하므로 semantic 재추출
  필요 분은 deviation 절차 유지.
- **hook 실패 시**: `~/.cache/graphify-rebuild.log` 확인 후 수동 재생성.
- **타 프로젝트 적용**: 변경 파일 유형 분포 확인 필수. docs-heavy 프로젝트는 효과
  제한적.

## 관련 문서

- [agent-team-protocol.md §9.1](./agent-team-protocol.md)
- [SKILL.md §2.2, §9 종료조건 #4](../../.claude/skills/task/SKILL.md)
