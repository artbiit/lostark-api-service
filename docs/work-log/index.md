# Work Log — 세션 간 handoff

시점성 있는 작업 메모. 다음 세션/담당자에 이어받기 위한 현재 상태 기록.

## 목록

- [2025-01-27 프로젝트 완성](./2025-01-27-project-completion.md) — v2.0.0 릴리스
  시점 완성도 스냅샷
- [2026-05-16 udp-service 카카오봇 승격](./2026-05-16-udp-service-kakao-bot-promotion/index.md)
  — legacy JS 봇 27종 명령 TypeScript 이식 + armories-normalizer 정정
  (session 20260515-231420)
- [2026-05-16 carry-over 처리 + abyss/guardian 제거](./2026-05-16-carry-over-resolution/index.md)
  — formatter 단위 테스트 9파일 + abyss/guardian 완전 제거(ADR-0003) + cache-flow
  Windows 경로 수정 + UDP smoke 검증 (session 20260516-040536)
- [2026-05-16 F7 — !정보 출력 legacy 수준 보강](./2026-05-16-armories-info-legacy-parity/index.md)
  — V9 타입 7건 정정, NormalizedCharacterDetail 확장(ArkPassive/characterLevel/guildMemberGrade),
  formatter 9 라인 보강, 테스트 N-1~N-7 + F-1~F-13 (session 20260516-230225)
- [2026-05-17 아크패시브 시즌 기준 armories 응답 재기획](./2026-05-17-armories-arkpassive-rewrite/index.md)
  — NormalizedAbilityStone 신설, formatter 7개 재작성, 11개 핸들러 톤 통일,
  이다 fixture + 11 골든 테스트, unit 203/203 pass (session 20260517-010704)

## 최근 세션

### 2026-05-17 — 아크패시브 시즌 기준 armories 응답 재기획 (session 20260517-010704)

- F7 "legacy parity" 방향이 아크패시브 시즌 기준으로 잘못된 전제임을 인지, 재기획.
- `NormalizedAbilityStone` 신설. `NormalizedCharacterDetail.abilityStone` 추가.
- formatter 재작성: `formatProfile` 각인3줄·돌오우너 삭제, `formatAbilityStone` 각인/디버프/레벨보너스/세공 4섹션, `formatEngravings` 정렬, `formatSkills` 30라인 절단, `formatColosseums` 최근 3시즌.
- 11개 핸들러 빈 응답 `~ 없는 것 같숨미당` 톤 통일. `truncateLines` 헬퍼 신설.
- 이다 fixture + 11개 골든 테스트 + L2 통합 1케이스. unit 203/203 + validate:monorepo pass.
- Carry-over: 카톡 "찾을 수 없음" 5종 디버깅 (별도 세션), dump:openapi 실행 권고.

### 2026-05-16 — F7 !정보 출력 legacy 수준 보강 (session 20260516-230225)

- V9 타입 7건 현행화 (ArkPassive 신설, ColosseumV9/ArmoryCardsV9.Effects/CombatSkillV9.Rune 정정).
- `NormalizedCharacterDetail` 확장: `arkPassive`, `characterLevel`, `guildMemberGrade` 신규 필드.
- formatter 보강: realization+직업, 각인 3줄, 돌 오우너, 엘/초/상, 진/깨/도, 갱신 시간 등 9 라인.
- `profile.ts` sections 에 `'equipment'` 추가.
- 신규 테스트: N-1~N-7 (normalizer) + F-1~F-13 (formatter). L1 178/178 + L2 3/3 pass.
- Carry-over: 없음.

### 2026-05-16 — carry-over 처리 + abyss/guardian 제거 (session 20260516-040536)

- formatter 단위 테스트 9파일 신규 (armories 11종 포함).
- L2 실측: 도비스/도가토 CategoryName calendar API 미출현 → ADR-0003: 명령 완전 제거.
- L3 cache-flow Windows 경로 버그 3건 수정 → 통과 (3-tier 354KB 정상 이동).
- UDP smoke 통합 테스트 신규 + 수동 dgram 검증 통과 (3ms~82ms).
- docker-compose.override.yml 신규 (로컬 PG 옵션).
- Carry-over: graphify 재생성 (commit 후), validate:refs graphify-out 이슈.

### 2026-05-15/16 — udp-service 카카오봇 승격 (session 20260515-231420)

- legacy/ JavaScript UDP 봇(명령 25종) 분석 + 신규 2종(`!카드`, `!전장`) 추가.
- envelope 계약 통합: UdpMessage 4종 폐기 → `{event,data,session}` 채택.
- armories-normalizer 결함 2건 정정 (`normalizeCards` Effects 누락,
  `normalizeColosseums` deathmatch → V9 실키 매핑).
- 검증: 전체 L1 pass (unit 81/81), L2 armories pass, OpenAPI no diff.
- Carry-over: armories formatter fixture 스냅샷, abyss/guardian 폴백 테스트,
  L3 cache-flow, graphify 재생성.

### 2026-04-23 — docs 재구성 + Swagger 파이프라인

- 기존 `Docs/` (대문자) 를 docs-first 구조 (`docs/`) 로 재분류 / 이동.
- `@fastify/swagger` + `swagger-ui` 플러그인 등록, `/docs` 엔드포인트 서빙.
- `scripts/dump-openapi.ts` 추가 —
  `loa-platform/contracts/lostark-api.openapi.yaml` 생성.
