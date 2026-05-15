# Work Log — 세션 간 handoff

시점성 있는 작업 메모. 다음 세션/담당자에 이어받기 위한 현재 상태 기록.

## 목록

- [2025-01-27 프로젝트 완성](./2025-01-27-project-completion.md) — v2.0.0 릴리스
  시점 완성도 스냅샷
- [2026-05-16 udp-service 카카오봇 승격](./2026-05-16-udp-service-kakao-bot-promotion/index.md)
  — legacy JS 봇 27종 명령 TypeScript 이식 + armories-normalizer 정정
  (session 20260515-231420)

## 최근 세션

### 2026-05-15/16 — udp-service 카카오봇 승격

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
