---
id: ADR-0003
title: udp-service — abyss(도비스)/guardian(도가토) 명령 완전 제거
status: accepted
date: 2026-05-16
deciders: [user, implementation-advisor]
supersedes: null
superseded_by: null
---

# ADR-0003: udp-service — abyss(도비스)/guardian(도가토) 명령 완전 제거

## Status

Accepted

## Context

`packages/udp-service` 카카오봇에는 `!도비스`(도비스 던전, 도전 어비스 던전)와
`!도가토`(도전 가디언 토벌) 두 가지 명령이 구현되어 있었다.

세션 20260516-040536 에서 `tsx scripts/check-calendar-categories.ts` 로 공식
Calendar API(`GET /gamecontents/calendar`) 실측을 수행한 결과:

- `'도비스 던전'`, `'도가토'`, `'도전 어비스 던전'`, `'어비스 던전'`,
  `'도전 가디언 토벌'`, `'가디언 토벌'` — 모두 `CategoryName` 응답에 **미출현**.
- 공식 API 엔드포인트 `GET /challenges/abyss-dungeons` 및
  `GET /challenges/guardian-raids` 도 **302 → /notfound** (deprecated).

사용자 확인: "도비스랑 도가토 컨텐츠가 생각해보니 최신 로아에선 더이상 없는
콘텐츠"

두 콘텐츠는 게임 내에서 종료되어 API 응답에 영구적으로 데이터가 존재하지 않는다.
명령을 유지하면 항상 empty-fallback 문자열을 반환하는 dead command 가 된다.

## Decision

`!도비스` / `!도가토` 명령과 이에 연동된 formatter, 테스트를 코드베이스에서
완전 제거한다.

**삭제 대상**

| 파일 | 유형 |
|---|---|
| `packages/udp-service/src/commands/gamecontents/abyss.ts` | 명령 핸들러 |
| `packages/udp-service/src/commands/gamecontents/guardian.ts` | 명령 핸들러 |
| `tests/unit/udp-service/commands/gamecontents/abyss.test.ts` | 단위 테스트 |
| `tests/unit/udp-service/commands/gamecontents/guardian.test.ts` | 단위 테스트 |

**수정 대상**

| 파일 | 변경 내용 |
|---|---|
| `packages/udp-service/src/commands/registry.ts` | `abyssCommand`/`guardianCommand` import + registry 등록 제거 |
| `packages/udp-service/src/formatters/gamecontents.ts` | `formatAbyss`/`formatGuardian` export 제거 |
| `packages/udp-service/src/commands/gamecontents/category-map.ts` | `ABYSS`/`GUARDIAN` 키 제거, 헤더 주석에 제거 사유 기재 |
| `tests/unit/udp-service/formatters/gamecontents.test.ts` | `formatAbyss`/`formatGuardian` 테스트 블록 제거 |
| `tests/integration/udp/smoke.test.mjs` | `!도비스`/`!도가토` 케이스 2개 제거 (7종 → 5종) |

## Consequences

**긍정적**

- Dead command 제거로 사용자 혼란 방지 (`!도움말` 목록에서 사라짐).
- `CALENDAR_CATEGORIES` 에서 미사용 키 정리 — category-map 상수가 실제 API 응답과
  일치.
- 연동 테스트에서 항상 실패할 소지가 있던 smoke 케이스 2건 제거.

**부정적 / 위험**

- 향후 게임이 해당 콘텐츠를 재도입할 경우 명령을 다시 추가해야 한다.
  단, ADR 과 work-log 에 삭제 사실이 기록되어 있어 재구현 맥락 파악이 용이함.
- `docs/work-log/2026-05-16-udp-service-kakao-bot-promotion/index.md` 에 기재된
  27종 명령 목록은 해당 시점의 사실 기록이므로 수정하지 않는다.
  향후 architecture 문서(`docs/architecture/udp-service-kakao-bot.md`) 갱신은
  documentation-advisor 가 별도 처리.

## Alternatives Considered

| 안 | 이유로 기각 |
|----|------------|
| A: 명령 유지 + "서비스 종료" 고정 응답 반환 | 항상 동일 문자열 반환하는 명령은 사용자에게 혼란. 제거가 명확. |
| B: 명령 disabled 플래그 추가 | 코드 복잡도 증가 대비 이득 없음. 재도입 시 ADR 참조해 신규 구현이 더 깔끔. |

## Rollback

ADR-0003 이전 상태로 복원하려면:

1. `git revert <ADR-0003 커밋 해시>` 로 4개 파일 복원 + 수정 파일 롤백.
2. `CALENDAR_CATEGORIES` 에 `ABYSS: '도비스 던전'`, `GUARDIAN: '도가토'` 재추가.
3. calendar API 응답에 해당 CategoryName 이 실제 등장하는지 재실측 필요.

## References

- 세션 work-log: [2026-05-16-udp-service-kakao-bot-promotion](../work-log/2026-05-16-udp-service-kakao-bot-promotion/index.md)
- 실측 스크립트: `scripts/check-calendar-categories.ts`
- 이전 ADR: [ADR-0001](ADR-0001-udp-envelope-adoption.md), [ADR-0002](ADR-0002-normalizer-colosseums-breaking.md)
