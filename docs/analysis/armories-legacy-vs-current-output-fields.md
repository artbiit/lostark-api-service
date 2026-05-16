---
kind: analysis
generated_at: 2026-05-16T22:55:00+09:00
related_session: 20260516-224308
related_followup: F7 (!정보 출력 legacy 수준 보강)
concerns:
  - 'ArmoryCharacterV9 타입에 ArkPassive 미정의 — F7 에서 타입 작업 선행 필요'
  - 'profile 명령 sections 미스매치 (equipment 미수신) — F7 에서 profile.ts 수정 필요'
---

# legacy 정보 명령 vs 현재 udp-service formatter — 차이 분석

본 문서는 다음 세션 **F7 (!정보 출력 legacy 수준 보강)** 의 사전 자료다. 본 세션
(sid: 20260516-224308) 은 조사·문서화만. 코드 변경 없음.

F7 세션 시작 시 이 문서를 첫 번째 입력으로 사용할 것. 10절 우선순위 표부터 확인.

## 1. 명령 매핑

| legacy 명령 | legacy 함수 | 현재 명령 | 현재 핸들러 |
|---|---|---|---|
| !정보 | armories.profile / createProfileResult | !정보 | profile.ts → formatProfile |
| !장비 | armories.equipments / createEquipmentsResult | !장비 | equipment.ts → formatEquipment |
| !아바타 | armories.avatar_url | !아바타 | avatar-url.ts → formatAvatarUrl |
| !스킬 | armories.skills | !스킬 | skills.ts → formatSkills |
| !보석 | armories.gems | !보석 | gems.ts → formatGems |
| !돌 | armories.abilityStone | !돌 | ability-stone.ts → formatAbilityStone |
| !각인 | armories.engravings | !각인 | engravings.ts → formatEngravings |
| !수집 | armories.collectibles | !수집 | collectibles.ts → formatCollectibles |
| !착장 | armories.avatar_equips | !착장 | avatars.ts → formatAvatars |
| — | (없음) | !카드 | cards.ts → formatCards (신규) |
| — | (없음) | !전장 | colosseums.ts → formatColosseums (신규) |

## 2. !정보 (가장 시급 — 사용자 보고)

### Legacy 출력 사양 (`legacy/src/Service/Commands/armories.js:16-108`)

```
[칭호] 캐릭터명
{realization_name} {class_name}           ← 각인 있을 때 깨달음효과명 + 직업

{각인 이름 첫글자 나열}
{각인 등급 첫글자 나열}
{각인 레벨 나열}

["{stone[0].activity_value}{stone[1].activity_value}돌 오우너"]   ← 합 ≥16 조건
(빈 줄)
템/전/원     {item_avg_level}/{char_level}/{expedition_level}
서버/길드    {server}/{guild_name}의 {guild_grade}
전투특성     {stats[2].type[0]}:{stats[2].value} {stats[3].type[0]}:{stats[3].value}
스킬포인트   {using/total}
pvp          {pvp_grade_name}
공격력/체력  {stats[1].value}/{stats[0].value}
엘/초/상     {totalElixirLevel}/{totalTranscendenceCount}/{totalAdvancedReforge}
진/깨/도     {ark_passive_evolution}/{realization}/{leap}
{tendencies: 지성/담력, 매력/친절}

갱신된 시간 {elapsedTime(last_update)}
```

### 현재 출력 사양 (`packages/udp-service/src/formatters/armories.ts:23-93`)

```
[칭호] 캐릭터명
{className}                               ← 깨달음효과명 없음

(빈 줄)
{각인 이름 첫글자만 1줄}                  ← 등급/레벨 줄 없음

(빈 줄)
템/전/원     {itemLevel}/{stats.find('캐릭터 레벨')}/{expeditionLevel}
서버/길드    {serverName}/{guildName}     ← guild_grade 없음
전투특성     {치명/특화/제압/신속 상위2 type[0]}:{value}
스킬포인트   {used/total}
pvp          {pvpGrade}
공격력/체력  {attack}/{hp}
{tendencies: type/type  point/point}
                                          ← 엘/초/상 누락
                                          ← 진/깨/도 누락
                                          ← 갱신 시간 누락
```

### 차이 표 — !정보

| 필드 | legacy 소스 | 현재 소스 | 갭 |
|---|---|---|---|
| 캐릭터명 + 칭호 | `character.title` + `name` | `detail.title` + `name` | 완전동등 |
| 직업명 | `character.class_name` | `detail.className` | 완전동등 |
| **깨달음 효과명** | `character.realization_name` | **없음** | **누락** |
| **각인 등급 첫글자** | `engravings[i].grade[0]` | 없음 | **누락** |
| **각인 레벨** | `engravings[i].level` | 없음 | **누락** |
| **돌 오우너 라인** | `stones[0..1].activity_value` 합 ≥16 | 없음 | **누락** |
| 아이템 레벨 | `item_avg_level` | `itemLevel` | 동등 |
| **캐릭터 레벨** | `char_level` (DB 직접) | `stats.find('캐릭터 레벨')` (V9 Stats 의존) | **간접 (Stats 누락 시 공백)** |
| 원정대 레벨 | `expedition_level` | `expeditionLevel` | 동등 |
| **길드 등급** | `guild_grade` (V9 `GuildMemberGrade`) | **없음** | **누락** |
| 전투특성 | `stats[2]`, `stats[3]` (DB ORDER BY value DESC) | combat stats 상위2 | 동등 |
| 스킬포인트 | `using_skill_point/total_skill_point` | `skillPoints.used/total` | 동등 |
| pvp | `pvp_grade_name` | `pvpGrade` | 동등 |
| 공격력/체력 | `stats[1].value/stats[0].value` | `stats.find('공격력')/find('최대 생명력')` | 동등 |
| **엘릭서 합계** | `selectTotalElixirLevel` (DB SUM) | **없음** | **누락** |
| **초월 합계** | `selectTotalTranscendenceCount` | **없음** | **누락** |
| **상재 합계** | `selectTotalAdvancedReforge` | **없음** | **누락** |
| **진/깨/도** | `ark_passive_evolution/realization/leap` | **없음** | **누락** |
| 성향 (tendencies) | `tendencies[].type/value` | `profile.tendencies[].type/point` | 동등 |
| **갱신 시간** | `elapsedTime(last_update)` | **없음** (단 `metadata.normalizedAt` 보유) | **누락 (즉시 복원 가능)** |

### 핵심 원인

1. **`NormalizedCharacterDetail` 의 ArkPassive 누락** — `진/깨/도`, `깨달음 효과명`, ArkPassive 각인 `level/grade` 모두 이 단일 누락에서 파생. V9 타입(`packages/shared/src/types/V9/armories.ts`)의 `ArmoryCharacterV9` 인터페이스에 `ArkPassive` 필드 자체가 정의 안 됨.
2. **`profile` 명령 sections 미스매치** — `getCharacterDetailPartial(name, ['profile', 'engravings'])` 만 요청. 엘/초/상은 `equipment` 의 tooltip 집계가 필요한데 equipment 데이터 자체가 없음.
3. **`GuildMemberGrade` 매핑 누락** — V9 타입에는 정의됨. `NormalizedCharacterDetail` 매핑만 한 줄 추가하면 됨.

## 3. !장비

| 필드 | legacy | 현재 | 갭 |
|---|---|---|---|
| 섹션 헤더 / 평균 품질 / 합계 / 장비 라인 / 엘릭서 섹션 | 모두 출력 | 모두 출력 | 동등 |
| **갱신 시간** | `elapsedTime(last_update)` | 없음 | **누락 (즉시 복원 가능)** |

## 4. !스킬

| 필드 | legacy | 현재 | 갭 |
|---|---|---|---|
| 스킬 필터 / 트라이포드 | 동일 | 동일 | 동등 |
| **룬 등급 첫글자** | `rune.Grade[0]` | `rune.grade[0]` 이지만 grade 필드 자체가 normalize 결과에서 누락 | **누락** |

V9 `CombatSkillV9.Rune` 타입에 `Grade` 필드 없음. 실제 API 응답은 포함 가능성. 타입 갱신 + normalizer 갱신 둘 다 필요.

## 5. !보석

| 필드 | legacy | 현재 | 갭 |
|---|---|---|---|
| 모든 필드 | 동일 tooltip 파싱 | 동일 | 완전동등 |

## 6. !각인

| 필드 | legacy | 현재 | 갭 |
|---|---|---|---|
| 헤더 | `{name}의 각인` | `{name}의 각인` | 동등 |
| **각인 이름** | DB `engraving.name` (ArkPassiveEffects[i].Name) | 있음 | 동등 |
| **각인 레벨** | DB `engraving.level` | **없음** | **누락** |
| **각인 등급** | DB `engraving.grade` | **없음** | **누락** |

**V9 각인 핵심 이슈**: ArkPassive 적용 캐릭은 legacy 가 `ArkPassiveEffects[]` 의 `{Name, Level, Grade}` 를 사용. 현재 normalizer 는 `ArmoryEngraving.Engravings[]` (장착 슬롯, Level/Grade 없음) 만 사용. ArkPassiveEffects 처리 자체가 없음.

## 7. !돌 / !수집 / !착장

| 명령 | 갭 |
|---|---|
| !돌 | 거의 동등. `activity_type` (감소/증가 구분) 추출 안 함 — !정보 의 돌 오우너 판단과 연동 |
| !수집 | 완전동등 |
| !착장 | 완전동등 |

## 8. !아바타 URL / !카드 / !전장

| 명령 | 갭 |
|---|---|
| !아바타 URL | 완전동등 |
| !카드 | legacy 없음. V9 타입 `ArmoryCardsV9.Effects[]` 와 normalizer 산출 구조 불일치 — normalizer 가 실제 API 응답 기준이라 동작은 OK |
| !전장 | legacy 없음. V9 타입 `ColosseumV9` 이 `OneDeathmatch/CoOpBattle` 미정의이지만 normalizer/formatter 는 처리 — V9 타입 정의가 구버전 |

## 9. NormalizedCharacterDetail 매핑 갭

`packages/data-service/src/normalizers/armories-normalizer.ts` 의 `NormalizedCharacterDetail`:

| V9 필드 | legacy 컬럼 | 현재 매핑 | 상태 |
|---|---|---|---|
| GuildMemberGrade | guild_grade | **없음** | **누락 (한 줄 추가로 해결)** |
| CharacterLevel (Stats 항목) | char_level | stats.find 의존 | 직접 필드로 승격 필요 |
| ItemMaxLevel | item_max_level | **없음** | 누락 |
| **ArkPassive** | ark_passive_* + realization_name + ArkPassiveEffects | **타입+필드 둘 다 없음** | **타입 신설 필요** |

## 10. F7 작업 우선순위

| 우선순위 | 항목 | 대상 파일 |
|---|---|---|
| **high** | `ArmoryCharacterV9` 에 `ArkPassive` 필드 정의 추가 | `packages/shared/src/types/V9/armories.ts` |
| **high** | `NormalizedCharacterDetail` 에 `arkPassive` (evolution/realization/leap/realizationName/engravingEffects[]) + `guildMemberGrade` + `characterLevel` 직접 필드 추가 | `armories-normalizer.ts` |
| **high** | normalizer 가 ArkPassive.Points / ArkPassive.Effects 파싱 (commandUtils.js:35-50 로직 이식) | `armories-normalizer.ts` |
| **high** | `formatProfile` 보강: realization, 각인 3줄(이름/등급/레벨), 진/깨/도, 엘/초/상, 길드 등급, 갱신 시간 | `formatters/armories.ts` |
| **high** | `profile` 명령 sections 에 `'equipment'` 추가 (엘/초/상 집계 위해) — 또는 normalizer 측 집계 필드 추가 (택일) | `commands/armories/profile.ts` 또는 `armories-normalizer.ts` |
| **medium** | `formatProfile` 의 돌 오우너 라인 | `formatters/armories.ts` |
| **medium** | `formatEngravings` 의 각인 Level/Grade 출력 | `formatters/armories.ts` |
| **medium** | `formatEquipment` 갱신 시간 추가 | `formatters/armories.ts` |
| **medium** | `formatSkills` rune Grade (V9 타입 갱신 동반) | `armories-normalizer.ts`, `types/V9/armories.ts` |
| **low** | `ColosseumV9` 타입에 `OneDeathmatch/CoOpBattle` 추가 | `types/V9/armories.ts` |
| **low** | `ArmoryCardsV9.Effects[]` 타입 현행화 | `types/V9/armories.ts` |

## 11. F7 진입 전 미해결 (실 API 샘플 확인 필요)

1. **ArkPassive 실제 응답 스키마**: `Points[].Name` 값 — '진화'/'깨달음'/'도약' 외 다른 값 가능 여부.
2. **ArkPassiveEffects vs Engravings 동시 존재**: ArkPassive 미적용 저티어 캐릭에서 `Engravings[]` 가 채워지는지.
3. **`CharacterLevel` 직접 필드**: V9 ArmoryProfile 에 별도 필드인지, Stats 배열에만 있는지.

→ F7 첫 단계로 실 API 응답 샘플 (`docs/upstream-api/` 또는 직접 호출) 검토 권고.

## 12. 회귀 테스트 계획 (F7 세션)

- `tests/unit/data-service/normalizers/armories-normalizer.test.ts` — ArkPassive 파싱 케이스 신설 (Points 3종 추출 + Effects realizationName 추출 + ArkPassiveEffects → engraving level/grade)
- `tests/unit/udp-service/formatters/armories.test.ts` — `formatProfile` 보강 출력 케이스 (각인 3줄 + 진/깨/도 + 엘/초/상 + 길드 등급 + 갱신 시간). 현 회귀 테스트는 server/길드 undefined 케이스만 검증.
- 샘플 데이터: 사용자 보유 캐릭 '아트네' 의 실 API 응답을 sanitize 한 fixture 1건 + 저티어 ArkPassive 미적용 캐릭 1건.

## 관련 문서

- [2026-05-16 udp-service 카카오봇 승격 work-log](../work-log/2026-05-16-udp-service-kakao-bot-promotion/index.md) — 본 분석의 배경이 된 이식 작업 세션
- [2026-05-16 carry-over 처리 work-log](../work-log/2026-05-16-carry-over-resolution/index.md) — 직전 carry-over 세션 (F7 의 선행)
