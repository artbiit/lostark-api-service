# lostark-remote-kakao
로스트아크 공식 API → Fastify HTTP 래핑·캐싱 백엔드.

본 파일은 권위 게이트만 둔다. 진입점/규칙 상세는 docs/.

## 진입
- docs: [docs/index.md](./docs/index.md)
- 개발 규칙: [docs/development/index.md](./docs/development/index.md)
- /task 프로토콜: [docs/development/agent-team-protocol.md](./docs/development/agent-team-protocol.md)

## 어겨서는 안 되는 것
- `--no-verify` 등으로 hook 우회 금지. hook 실패 시 근본 원인을 찾아 고친다.
- 도메인 코드(`packages/data-service/`, `packages/shared/`) 에 Fastify 타입 직접 참조 금지.
- PostgreSQL 은 `pg` parameterized query (`$1, $2, …`). 문자열 보간 raw SQL 금지.
- 새 env 는 `packages/shared/src/config/env.ts` zod 스키마에 먼저 등록 후 사용.
- ESM `.ts` 소스에서도 상대 import 는 `.js` 확장자 (NodeNext).
- 도메인 용어는 로스트아크 원어("각인", "카오스 게이트", "시블링") 그대로. 번역 금지.
- 파괴적 조작(DB 마이그레이션 적용, OpenAPI dump 외부 게시, 파일 ≥5 삭제 등)은
  [agent-team-protocol §6](./docs/development/agent-team-protocol.md) 게이트.
