# Changes — 변경 이력

실제 동작이 바뀐 구현 변경을 시점 기록. 단순 리팩터/오타는 제외.

## 2026-05

- feat(udp-service):
  [!분배금 명령어 재구성 — PVE 전리품 경매 손익분기 입찰 한도](./2026-05-17-share-command-bid-cap-rework.md)
  — 출력 라벨/공식 명료화(자가소비·재판매·비낙찰분배 분리), 인원 4/8인(16인 제거),
  description 텍스트 갱신, 테스트 6 케이스. (session 20260517-215316)
- feat+refactor(data-service,udp-service):
  [아크패시브 시즌 기준 armories 응답 재기획](./2026-05-17-armories-arkpassive-rewrite.md)
  — NormalizedAbilityStone 신설, formatAbilityStone/Engravings 재작성, 11개 핸들러 톤 통일,
  formatSkills 30라인/formatColosseums 3시즌 절단, 골든 테스트 11개. (session 20260517-010704)
- feat+fix(shared,data-service,udp-service):
  [F7 armories !정보 legacy parity](./2026-05-16-armories-info-legacy-parity.md)
  — V9 타입 7건 정정(ArkPassive/ColosseumV9/ArmoryCardsV9.Effects/CombatSkillV9.Rune),
  NormalizedCharacterDetail 확장(arkPassive/characterLevel/guildMemberGrade),
  formatter 9 라인 보강, profile sections +equipment.
  **LoA-Bot generated.ts 재생성 필요.** (session 20260516-230225)
- feat+fix+chore(udp-service,tests):
  [formatter 단위 테스트 신규 + abyss/guardian 제거 + cache-flow 경로 수정](./2026-05-16-formatter-tests-and-abyss-guardian-removal.md)
  — 단위 테스트 9파일, UDP smoke, abyss/guardian 완전 제거(ADR-0003),
  cache-flow Windows 경로 3건 수정. (session 20260516-040536)
- feat+fix(udp-service,data-service,shared):
  [udp-service 카카오봇 승격 + normalizer 정정](./2026-05-16-udp-service-kakao-bot-promotion.md)
  — 27종 카카오톡 명령 이식, envelope 계약 변경(breaking),
  normalizeCards Effects 정정, normalizeColosseums deathmatch 제거(breaking).
  (session 20260515-231420)
- fix(tests): [tests/api/ alias 결함 정정](./2026-05-15-tests-api-alias-fix.md)
  — 패키지.json 스크립트 + test-runner 경로를 `tests/integration/api/` 로
  재지정, 4개 문서 경로 인용 정정. (20260515 옵션 b 채택)

## 2026-04

- feat(rest-service): Swagger UI + OpenAPI dump 파이프라인 도입 (`/docs` 서빙,
  `yarn workspace @lostark/rest-api dump:openapi` 로
  `loa-platform/contracts/lostark-api.openapi.yaml` 갱신).
- docs: 기존 `Docs/` 를 docs-first 구조 (`docs/`) 로 재구성.
