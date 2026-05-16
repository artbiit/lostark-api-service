# Changes — 변경 이력

실제 동작이 바뀐 구현 변경을 시점 기록. 단순 리팩터/오타는 제외.

## 2026-05

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
