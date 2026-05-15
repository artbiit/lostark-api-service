# Architecture — 시스템 설계

Fastify 기반 HTTP 래퍼 서비스의 경계와 내부 구성.

## 목록

- [system-overview](./system-overview.md) — 시스템 아키텍처 및 설계 원칙 (3-tier
  캐시, 모노레포 구성 포함)
- [udp-service-kakao-bot](./udp-service-kakao-bot.md) — udp-service 카카오봇
  모듈 구조: envelope 계약, 라우팅 흐름, 명령 27종, Redis 캐시 키 (2026-05-16)

## 레이어 경계 (요약)

- `packages/rest-service` — Fastify 라우트/플러그인, 외부 공개 API. OpenAPI
  스펙은 이 레이어에서 선언 후 `dump:openapi` 로 `loa-platform/contracts/` 에
  공유.
- `packages/data-service` — 로스트아크 공식 API 호출, 캐시 계층(메모리/Redis/DB)
  관리.
- `packages/udp-service` — 메신저봇R 클라이언트로부터 UDP 수신, 카카오톡 명령
  파싱·포맷팅·응답. data-service 싱글톤을 통해 API 위임.
- `packages/shared` — env/logger/공통 타입.

세부 내용은 `system-overview.md` 참조.
