# Work Log — 세션 간 handoff

시점성 있는 작업 메모. 다음 세션/담당자에 이어받기 위한 현재 상태 기록.

## 목록

- [2025-01-27 프로젝트 완성](./2025-01-27-project-completion.md) — v2.0.0 릴리스
  시점 완성도 스냅샷

## 최근 세션

### 2026-04-23 — docs 재구성 + Swagger 파이프라인

- 기존 `Docs/` (대문자) 를 docs-first 구조 (`docs/`) 로 재분류 / 이동.
- `@fastify/swagger` + `swagger-ui` 플러그인 등록, `/docs` 엔드포인트 서빙.
- `scripts/dump-openapi.ts` 추가 —
  `loa-platform/contracts/lostark-api.openapi.yaml` 생성.
