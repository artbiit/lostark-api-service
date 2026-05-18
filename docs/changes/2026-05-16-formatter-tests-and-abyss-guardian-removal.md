---
session_id: 20260516-040536
date: 2026-05-16
type: feat+fix+chore
scope: udp-service, tests
---

# 변경: formatter 단위 테스트 신규 + abyss/guardian 제거 + cache-flow 경로 수정

세션 20260516-040536 에서 반영된 구현 변경 이력. 직전 세션(20260515-231420)
carry-over 5개 항목 처리 + Task F(도비스/도가토 제거) 포함.

## 변경 유형

| 유형  | 범위                                                      |
| ----- | --------------------------------------------------------- |
| feat  | 신규 단위 테스트 9개 파일 (formatter + minigame)          |
| feat  | UDP smoke 통합 테스트 신규                                |
| feat  | docker-compose.override.yml 신규 (로컬 PG 옵션)           |
| feat  | scripts/check-calendar-categories.ts 신규                 |
| chore | abyss/guardian 명령·formatter·테스트 완전 제거 (ADR-0003) |
| fix   | cache-flow Windows 경로 버그 3건 수정                     |

## 신규 파일

### 단위 테스트 (9개)

| 파일                                                        | 커버 대상                                                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `tests/unit/udp-service/formatters/armories.test.ts`        | formatProfile·Equipment·Skills·Gems·Engravings·AbilityStone·Collectibles·Avatars·AvatarUrl·Cards·Colosseums (11종) |
| `tests/unit/udp-service/formatters/characters.test.ts`      | formatSiblings                                                                                                     |
| `tests/unit/udp-service/formatters/gamecontents.test.ts`    | formatProcyon·Events (abyss/guardian 블록은 ADR-0003 으로 제거)                                                    |
| `tests/unit/udp-service/formatters/auctions.test.ts`        | formatGemSearch                                                                                                    |
| `tests/unit/udp-service/formatters/markets.test.ts`         | formatExpensiveEngravings·formatEngravingSearch                                                                    |
| `tests/unit/udp-service/commands/minigame/dice.test.ts`     | !주사위 핸들러                                                                                                     |
| `tests/unit/udp-service/commands/minigame/fortune.test.ts`  | !질문 핸들러                                                                                                       |
| `tests/unit/udp-service/commands/minigame/pick-one.test.ts` | !vs 핸들러                                                                                                         |
| `tests/unit/udp-service/commands/minigame/share.test.ts`    | !분배금 핸들러                                                                                                     |

### 통합 테스트

| 파일                                   | 설명                                                                  |
| -------------------------------------- | --------------------------------------------------------------------- |
| `tests/integration/udp/smoke.test.mjs` | UDP envelope 송수신 스모크. `LOSTARK_API_KEY` 없으면 skip. 포트 13001 |

### 기타 신규

| 파일                                   | 설명                                                                |
| -------------------------------------- | ------------------------------------------------------------------- |
| `scripts/check-calendar-categories.ts` | `GET /gamecontents/calendar` 실측 → CategoryName 고유값 stdout 출력 |
| `docker-compose.override.yml`          | 로컬 전용 postgres:16-alpine 서비스 (선택적 사용)                   |

## 삭제/수정된 파일 (ADR-0003: abyss/guardian 제거)

### 삭제

| 파일                                                            | 사유                              |
| --------------------------------------------------------------- | --------------------------------- |
| `packages/udp-service/src/commands/gamecontents/abyss.ts`       | 콘텐츠 종료. dead command 제거    |
| `packages/udp-service/src/commands/gamecontents/guardian.ts`    | 콘텐츠 종료. dead command 제거    |
| `tests/unit/udp-service/commands/gamecontents/abyss.test.ts`    | 대상 소스 삭제에 따른 테스트 삭제 |
| `tests/unit/udp-service/commands/gamecontents/guardian.test.ts` | 대상 소스 삭제에 따른 테스트 삭제 |

### 수정

| 파일                                                             | 변경 내용                                                    |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/udp-service/src/commands/registry.ts`                  | `abyssCommand`/`guardianCommand` import + registry 등록 제거 |
| `packages/udp-service/src/formatters/gamecontents.ts`            | `formatAbyss`/`formatGuardian` export 제거                   |
| `packages/udp-service/src/commands/gamecontents/category-map.ts` | `ABYSS`/`GUARDIAN` 키 제거                                   |
| `tests/unit/udp-service/formatters/gamecontents.test.ts`         | formatAbyss/formatGuardian 테스트 블록 제거                  |
| `tests/integration/udp/smoke.test.mjs`                           | `!도비스`/`!도가토` 케이스 2개 제거 (7종 → 5종)              |

## cache-flow 경로 버그 수정

`tests/integration/api/simple-cache-flow-test.mjs` 의 pre-existing Windows 경로
오류 3건:

| 수정 위치           | 내용                                                           |
| ------------------- | -------------------------------------------------------------- |
| `import` path       | `import.meta.url` → `pathToFileURL` 래핑으로 Windows 경로 처리 |
| `projectRoot` 계산  | `\` 구분자 대응                                                |
| `import.meta` guard | ESM 모듈 감지 조건 수정                                        |

## 호환성 영향

| 항목           | 영향                                     |
| -------------- | ---------------------------------------- |
| `!도비스` 명령 | 명령 자체 제거. 응답 없음 (silent drop). |
| `!도가토` 명령 | 명령 자체 제거. 응답 없음 (silent drop). |
| `!도움말` 목록 | 도비스/도가토 항목 미표시                |
| REST API       | 변경 없음                                |
| OpenAPI        | no diff                                  |
| DB 스키마      | 변경 없음                                |

## 마이그레이션

없음. DB 마이그레이션 불필요.

## 결정 근거

- ADR-0003: 실측(2026-05-16) 결과 `CategoryName` 에 도비스/도가토 미출현. 공식
  엔드포인트 `GET /challenges/abyss-dungeons`, `GET /challenges/guardian-raids`
  도 302→/notfound.
- 사용자 확인: "도비스랑 도가토 컨텐츠가 생각해보니 최신 로아에선 더이상 없는
  콘텐츠"

상세 결정 맥락: [ADR-0003](../adr/ADR-0003-abyss-guardian-removal.md)

## 검증

| 항목                    | 결과                          |
| ----------------------- | ----------------------------- |
| L1 unit (115/115)       | PASS                          |
| L1 typecheck            | PASS                          |
| L1 lint                 | PASS                          |
| L1 build                | PASS                          |
| L3 cache-flow (Windows) | PASS (3-tier 354KB 정상 이동) |
| UDP smoke 수동 검증     | PASS (3ms~82ms 응답)          |

## 관련 문서

- [ADR-0003: abyss/guardian 명령 완전 제거](../adr/ADR-0003-abyss-guardian-removal.md)
- [work-log: 세션 20260516-040536](../work-log/2026-05-16-carry-over-resolution/index.md)
- [cache-flow 테스트 결과](../development/testing/cache-flow-test-results.md)
- [architecture: udp-service 카카오봇 모듈 구조](../architecture/udp-service-kakao-bot.md)
