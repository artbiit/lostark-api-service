# Security — 보안 · 개인정보

인증/인가, 레이트 리밋, 입력 검증, 비밀 값 관리, 개인정보 처리 방침.

## 목록

- 외부 인증은 현재 없음 (내부망 전용 서비스). 도입 시 ADR 로 결정 기록 후 이 디렉토리에 운용 문서 추가.
- 레이트 리밋: `@fastify/rate-limit` 플러그인 (세부 설정은 `development/configuration.md` 참조).
- 개인정보: [../domain/streamer-research/privacy-notice](../domain/streamer-research/privacy-notice.md) — 스트리머 연구 관련 정책은 도메인 문맥이 있어 `domain/` 에 두고 여기선 링크만.

## 시크릿 관리

- `.env` 커밋 금지 (`.env.example` 만 커밋). env 키 스키마는 `packages/shared/config/env` 에서 관리.
