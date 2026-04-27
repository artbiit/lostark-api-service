# Changes — 변경 이력

실제 동작이 바뀐 구현 변경을 시점 기록. 단순 리팩터/오타는 제외.

## 2026-04

- feat(rest-service): Swagger UI + OpenAPI dump 파이프라인 도입 (`/docs` 서빙, `yarn workspace @lostark/rest-api dump:openapi` 로 `loa-platform/contracts/lostark-api.openapi.yaml` 갱신).
- docs: 기존 `Docs/` 를 docs-first 구조 (`docs/`) 로 재구성.
