---
kind: changes
generated_at: 2026-05-17T03:00:00+09:00
related_session: 20260517-010704
related_work_log: docs/work-log/2026-05-17-armories-arkpassive-rewrite/index.md
---

# Changes: 아크패시브 시즌 기준 armories 응답 재기획 (2026-05-17)

## 개요

직전 F7 세션의 "legacy parity" 방향이 아크패시브 시즌 기준으로 잘못된 전제임을
인지하고 응답 본문을 전면 재정의. 명령어 식별자(`!정보 !장비 ...`)는 유지하되,
각 응답 본문과 도메인 모델을 아크패시브 시즌 현행 시스템에 맞춤.

## Breaking Change 여부

| 항목 | 판정 | 영향 |
|------|------|------|
| `NormalizedCharacterDetail.abilityStone` 신규 필드 | **backward-compatible** | optional 추가. 기존 컨슈머 코드 수정 불필요. 기존 캐시 entry 는 `undefined → null` graceful 처리 |
| `NormalizedAbilityStone` / `NormalizedAbilityStoneEffect` / `AbilityStoneEffectKind` 신설 | **신규 타입 (하위 호환)** | 소비처: `formatAbilityStone` 전용. 기존 컨슈머 영향 없음 |
| `formatProfile` 응답 — 각인 3줄·돌 오우너 라인 삭제 | **런타임 동작 변경** | `!정보` 카톡 응답에서 해당 라인 제거됨 |
| `formatAbilityStone` 응답 — 전면 재작성 | **런타임 동작 변경 (breaking)** | `!돌` 응답이 legacy `+숫자` 활성치 행에서 각인/디버프/레벨보너스/세공 4섹션 구조로 변경 |
| `formatEngravings` 응답 — 정렬 추가 + 단일 모드 | **런타임 동작 변경** | `!각인` 응답이 level desc / name asc 정렬로 통일. ArkPassive 비활성 분기 폐기 |
| `formatSkills` 30라인 절단 가드 | **런타임 동작 변경** | 스킬 30개 초과 시 `... 외 N개 생략` 추가됨. 통상 케이스(≤25)는 영향 없음 |
| `formatColosseums` 최근 3시즌 절단 | **런타임 동작 변경** | 활성 시즌 ≥5 일 때 최근 3시즌만 노출 |
| 11개 핸들러 빈 응답 톤 통일 | **런타임 동작 변경** | `~ 찾을 수 없습니다` → `~ 없는 것 같숨미당` 으로 전체 통일 |
| OpenAPI schema diff | **없음 (예상)** | `NormalizedCharacterDetail` optional 추가만. REST 라우트 노출 여부는 `dump:openapi` 로 확인 필요 (V10 orchestrator 인계) |

> **캐시 무효화 안내**: `NormalizedCharacterDetail` JSON 에 `abilityStone` 필드가 추가됨.
> 기존 캐시 entry 는 `abilityStone: undefined` → formatter 가 null 로 처리 (graceful degradation).
> 즉시 신 응답을 원하면 Redis `FLUSHDB` 또는 캐시 prefix 무효화 가능 (선택).

## 변경 상세

### Phase 1 — 신 도메인 모델 + normalizer

파일: `packages/data-service/src/normalizers/armories-normalizer.ts`

| # | 변경 | 내용 |
|---|------|------|
| 1.1 | `AbilityStoneEffectKind` 타입 신설 | `'engraving' \| 'debuff' \| 'level-bonus'` |
| 1.2 | `NormalizedAbilityStoneEffect` 인터페이스 신설 | `name`, `level`, `kind`, `bonusText` |
| 1.3 | `NormalizedAbilityStone` 인터페이스 신설 | `name`, `grade`, `craftingBonus`, `engravingEffects[]` |
| 1.4 | `NormalizedCharacterDetail.abilityStone` 추가 | `NormalizedAbilityStone \| null` |
| 1.5 | `normalizeAbilityStone(equipment)` 신설 | `Type === '어빌리티 스톤'` 첫 건 tooltip 파싱 → 3분류 산출 |
| 1.6 | `classifyAbilityStoneEffect(raw)` 신설 | 색상코드+키워드 결정 트리. `#73DC04`/`레벨 보너스` → level-bonus, `#FE2E2E` → debuff, 그 외 → engraving |
| 1.7 | `normalizeCharacterDetail` 통합 | `abilityStone` 필드 포함 |

파일: `packages/data-service/src/services/armories-service.ts`

| # | 변경 | 내용 |
|---|------|------|
| 1.8 | `getCharacterDetailPartial` `case 'equipment':` 확장 | HIT/MISS 양 분기에 `result.abilityStone = ... ?? null` 동봉. `!돌` 명령 sections=['equipment'] 만 요청해도 abilityStone 보장 |

파일: `packages/data-service/src/index.ts`

| # | 변경 |
|---|------|
| 1.9 | 신 타입 6종 `export type` re-export (udp-service import 표면 노출) |

### Phase 2 — formatter 재작성 + 핸들러 톤 통일

파일: `packages/udp-service/src/formatters/kakao.ts`

| # | 변경 | 내용 |
|---|------|------|
| 2.1 | `truncateLines(lines, max, footerTemplate)` 헬퍼 신설 | 라인 배열을 max 줄로 절단. 절단 시 `... 외 {n}개 생략` 추가. 카카오톡 2000자/30라인 가드용 |

파일: `packages/udp-service/src/formatters/armories.ts`

| # | 변경 | 내용 |
|---|------|------|
| 2.2 | `formatProfile` 라인 삭제 | 각인 3줄 (이름첫글자/등급첫글자/Lv), 돌 오우너 라인 삭제. `summarizeStoneActivity` 함수 삭제 |
| 2.3 | `formatAbilityStone` 완전 재작성 | 입력을 `detail.equipment[].tooltip` 재파싱 → `detail.abilityStone` 으로 전환. 출력: 헤더+등급 / [각인] / [디버프] / [레벨 보너스] / [세공] 4섹션 |
| 2.4 | `formatEngravings` 재작성 | level desc / name asc 정렬. `[등급] 이름 Lv.N` 단일 모드 (level/grade 모두 있을 때). 비활성 fallback `[이름]` 유지 |
| 2.5 | `formatSkills` 절단 가드 추가 | `truncateLines(..., 30)` 적용. 30라인 초과 시 `... 외 N개 생략` |
| 2.6 | `formatColosseums` 시즌 절단 | 활성 시즌 ≥5 → `slice(-3)` 최근 3시즌만 |
| 2.7 | 빈 응답 메시지 7+ 함수 통일 | `formatEquipment` / `formatAvatarUrl` / `formatSkills` / `formatGems` / `formatAvatars` / `formatCards` / `formatColosseums` 빈 응답 → `~ 없는 것 같숨미당` 톤 |

파일: `packages/udp-service/src/commands/armories/*.ts` (11개)

| # | 변경 | 내용 |
|---|------|------|
| 2.8 | 핸들러 11개 빈 응답 1줄 치환 | `~ 찾을 수 없습니다.` → `~ 없는 것 같숨미당.` (명령별 표현은 design §1.3 표 준수) |

### Phase 3 — fixture + 골든 테스트 + L2

| 파일 | 유형 | 내용 |
|------|------|------|
| `tests/fixtures/armories/character-detail-ida.json` | 신규 fixture | 이다 V9 sample → `normalizeCharacterDetail` 결과 직렬화. ~330 LOC |
| `tests/unit/udp-service/formatters/armories.golden.test.ts` | 신규 | 11개 명령 골든 출력 비교 테스트. `formatAbilityStone` design §3.6 byte-equal |
| `tests/integration/api/armories.test.ts` | 수정 | L2 케이스 1건 신설: 어빌리티 스톤 live normalize 정상 확인 (SKIP_LIVE_API=1 skip 처리) |

## 검증 결과

| AC | 결과 |
|----|------|
| L1 (typecheck + unit 203/203 + build + lint + validate:monorepo) | **pass** |
| V4 formatProfile 각인3줄/돌오우너 부재 | **pass** |
| V5 formatAbilityStone 이다 byte-equal | **pass** |
| V6 formatEngravings [유물]+정렬 5줄 | **pass** |
| V7 빈 응답 톤 11개 통일 | **pass** |
| V8 formatSkills 30줄 truncate | **pass** |
| L2 어빌리티 스톤 케이스 | **pass_with_skip** (SKIP_LIVE_API=1) |
| L2 should handle API errors gracefully | fail (pre-existing, 이번 변경 무관) |

## 후속 권고

- 카톡 "찾을 수 없음" 5종 디버깅 — 별도 세션 (Q3 결정)
- `yarn workspace @lostark/rest-api dump:openapi` 실행 후 LoA-Bot generated types 재생성 권고 (파괴적 조작 게이트 통과 후)
- `should handle API errors gracefully` (`armories.test.ts:86`) assertion 버그 수정 — 별도 fix

## 관련 문서

- [work-log: 아크패시브 시즌 재기획 세션](../work-log/2026-05-17-armories-arkpassive-rewrite/index.md)
- [analysis: armories legacy vs 현재 formatter 출력 필드 비교](../analysis/armories-legacy-vs-current-output-fields.md) — 본 재기획으로 역전. `superseded_note` 참조
- [changes: F7 armories !정보 legacy parity](./2026-05-16-armories-info-legacy-parity.md) — 본 세션이 재기획한 대상
