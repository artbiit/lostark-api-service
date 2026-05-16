---
kind: changes
generated_at: 2026-05-16T23:55:00+09:00
related_session: 20260516-230225
related_work_log: docs/work-log/2026-05-16-armories-info-legacy-parity/index.md
---

# Changes: F7 — `!정보` 출력 legacy 수준 보강 (2026-05-16)

## 개요

`!정보` 명령 출력을 legacy `commandUtils.js` / `armories.js` 수준으로 보강.
`NormalizedCharacterDetail` 도메인 모델에 ArkPassive / characterLevel / guildMemberGrade
필드를 추가하고, V9 타입 3건을 실응답 기반으로 정정, formatter 9개 출력 라인을 추가했다.

## Breaking Change 여부

| 항목 | 판정 | 영향 |
|------|------|------|
| `NormalizedCharacterDetail` 신규 필드 (`characterLevel`, `guildMemberGrade?`, `arkPassive`) | **backward-compatible** | optional 추가. 기존 컨슈머 코드 수정 불필요 |
| `NormalizedCharacterDetail.engravings[].level?/grade?` 추가 | **backward-compatible** | optional 추가 |
| `CombatSkillV9.Rune` 에 `Grade`, `Tooltip` 추가 | **타입 정정 (외부 컨슈머 영향)** | LoA-Bot 등 `generated.ts` 자동생성 소비자는 **재생성 필요** |
| `ArmoryCardsV9.Effects[]` 재정의 (`{Index, CardSlots[], Items[]}`) | **타입 정정 (외부 컨슈머 영향)** | 위 동일 |
| `ColosseumV9` 재정의 (7키 + `ColosseumModeStatV9`) | **타입 정정 (외부 컨슈머 영향)** | 위 동일 |
| `profile.ts` sections 에 `'equipment'` 추가 | **런타임 동작 변경** | `!정보` 호출 시 upstream API 에 equipment sections 추가 요청 발생. 응답 크기 증가 |
| formatter 출력 라인 추가 | **런타임 동작 변경** | `!정보`, `!각인`, `!장비`, `!스킬` 출력 내용 변경 (legacy parity 달성) |
| OpenAPI schema diff | **없음** | `NormalizedCharacterDetail` optional 추가만. `yarn dump:openapi` diff 없음 |

> **LoA-Bot 다운스트림 안내**: `packages/shared` V9 타입이 정정되었으므로
> `loa-platform` 프로젝트의 `generated.ts` 를 재생성(`yarn workspace @lostark/rest-api dump:openapi` 후 클라이언트 codegen)할 것.

## 변경 상세

### Phase 1 — V9 타입 현행화

파일: `packages/shared/src/types/V9/armories.ts`

| # | 변경 | 내용 |
|---|------|------|
| 1.1 | `CombatSkillV9.Rune` 보강 | `Grade: string`, `Tooltip: string` 추가. 기존 `{Name, Icon}` 만 있던 것을 실응답 기반으로 정정 |
| 1.2 | `ColosseumV9` + `ColosseumModeStatV9` 재정의 | 실응답 7키 (`SeasonName`, `Competitive`, `TeamDeathmatch`, `TeamElimination`, `CoOpBattle`, `OneDeathmatch`, `OneDeathmatchRank`) + 모드 통계 11키 |
| 1.3 | `ArkPassivePointV9` / `ArkPassiveEffectV9` / `ArkPassiveV9` 신설 | `Title`, `IsArkPassive`, `Points[]`, `Effects[]` 구조 |
| 1.4 | `ArmoryProfileV9.CharacterLevel: number` 추가 | Stats 배열 의존 없이 직접 필드 |
| 1.5 | `ArkPassiveEngravingEntryV9` 신설 | `{AbilityStoneLevel, Grade, Level, Name, Description}` |
| 1.6 | `ArmoryEngravingV9` 보강 | `Engravings?/Effects?` nullable, `ArkPassiveEffects?: ArkPassiveEngravingEntryV9[]` 추가 |
| 1.7 | `ArmoryCardsV9.Effects[]` 재정의 | `{Index, CardSlots: number[], Items: [{Name, Description}]}`. 기존 `{SetName, SetCount, SetEffect}` 는 실응답과 불일치였음 |
| 1.8 | `ArmoryCharacterV9.ArkPassive` 추가 | `ArkPassiveV9 | null` |

### Phase 2 — NormalizedCharacterDetail 확장 + Normalizer 매핑

파일: `packages/data-service/src/normalizers/armories-normalizer.ts`, `packages/data-service/src/services/armories-service.ts`

| # | 변경 | 내용 |
|---|------|------|
| 2.1 | `NormalizedArkPassive` 신규 export | `realizationName: string | null`, `title`, `isArkPassive`, `evolution`, `realization`, `leap` (Points 3종 value) |
| 2.2 | `NormalizedCharacterDetail` 확장 | `characterLevel: number`, `guildMemberGrade?: string`, `arkPassive: NormalizedArkPassive | null` |
| 2.3 | `engravings[]` 확장 | `level?: number`, `grade?: string` optional |
| 2.4 | `combatSkills[].rune` 확장 | `grade?: string`, `tooltip?: string` optional |
| 2.5 | `normalizeCharacterDetail` 본문 | `characterLevel`, `guildMemberGrade`, `arkPassive` 매핑 추가 |
| 2.6 | `normalizeEngravings` 분기 | ArkPassiveEffects 존재 시 우선 사용 → 각인 `level`/`grade` 채움. 없으면 Engravings fallback (기존 동작) |
| 2.7 | `normalizeArkPassive` private 신설 | Points 3종 추출 + `Effects[0].Description` 정규식(`>([^<]+)\sLv\./`)으로 realizationName 추출 |
| 2.8 | `normalizeCombatSkills` 보강 | rune 매핑에 `grade`, `tooltip` optional 추가 |
| 2.9 | `pickCoreFields` 보강 | `characterLevel`, `guildMemberGrade`, `arkPassive`, `metadata` 추가 (partial 응답 핵심 필드 포함) |

### Phase 3 — Formatter 보강

파일: `packages/udp-service/src/formatters/armories.ts`

| # | 변경 | 내용 |
|---|------|------|
| 3.1 | `elapsedTime` import 추가 | 기존 헬퍼 재사용 |
| 3.2 | `formatProfile` 전면 보강 | 출력 라인 순서 14단계로 재편. 추가된 라인: realization+직업명, 각인 3줄(이름 첫글자/등급 첫글자/레벨), 돌 오우너(positive 합산 ≥16), 길드 등급, 엘/초/상 합계, 진/깨/도, 갱신 시간 |
| 3.3 | `summarizeStoneActivity` 헬퍼 신설 | tooltip `[감소]` 키워드 검출로 positive/negative 분류. positive 합산 반환 |
| 3.4 | `summarizeEquipmentForProfile` 헬퍼 신설 | `parseEquipmentTooltip` 재사용으로 6장비 엘릭서/초월/상재 집계 |
| 3.5 | `formatEngravings` 보강 | ArkPassive 활성 (`level` + `grade` 모두 있을 때): `[등급] 이름 Lv.N`. 비활성 fallback: 기존 `[이름]` 동작 유지 |
| 3.6 | `formatEquipment` 보강 | 마지막에 `갱신된 시간 N분 전` 라인 추가 |

### Phase 4 — Profile command sections 확장

파일: `packages/udp-service/src/commands/armories/profile.ts`

- sections 배열에 `'equipment'` 추가. 엘/초/상 집계 및 돌 오우너 검출에 필요.

### Phase 5 — 회귀 테스트 + fixtures

| 파일 | 유형 | 내용 |
|------|------|------|
| `tests/fixtures/armories/character-ark-passive.json` | 신규 | ArkPassive 활성 캐릭 (아트네 실응답 sanitize). 464KB |
| `tests/fixtures/armories/character-no-ark-passive.json` | 신규 | ArkPassive null + Engravings-only 변형. 446KB |
| `tests/unit/data-service/normalizers/armories-normalizer.test.ts` | 신규 | N-1~N-7: ArkPassive 활성/비활성, engravingEffects 매핑, guildMemberGrade/characterLevel/rune.grade, fallback |
| `tests/unit/udp-service/formatters/armories.test.ts` | 수정 | F-1~F-13: 각인 3줄, 진/깨/도, 엘/초/상, 길드 등급, 갱신 시간, 돌 오우너, ArkPassive null 폴백, characterLevel, 등급/이름/레벨 표기, rune grade |

## 검증 결과

| AC | 결과 |
|----|------|
| L1 (typecheck + unit 178/178 + build + lint + validate:monorepo) | **pass** |
| L2 신규 테스트 N-1~N-7, F-1~F-13 | **pass** |
| L2 contract-lostark-api (실 API 3/3) | **pass** |
| 로그 스캔 | **clean** |

## 관련 문서

- [work-log: F7 세션](../work-log/2026-05-16-armories-info-legacy-parity/index.md)
- [analysis: armories legacy vs 현재 formatter 출력 필드 비교](../analysis/armories-legacy-vs-current-output-fields.md) — F7 concerns 해소
