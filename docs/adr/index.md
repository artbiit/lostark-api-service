# ADR — Architecture Decision Records

되돌리기 어려운 결정을 번호제로 기록한다. **append-only**. 결정을 뒤집을 때는 새
ADR 을 발행하고 supersede 관계를 명시한다.

## 목록

_기존 프로젝트(v1 → v2.0.0 전환) 시기의 결정은 명시적 ADR 문서로 남아 있지 않다.
이후 중요한 결정(캐시 전략 변경, 인증 도입, 스택 업그레이드 등) 부터
`ADR-NNNN-<slug>.md` 로 기록한다._

- [ADR-0001](./ADR-0001-udp-envelope-adoption.md) — UDP envelope: 클라이언트
  `{event,data,session}` 채택 및 UdpMessage 4종 폐기 (2026-05-16)
- [ADR-0002](./ADR-0002-normalizer-colosseums-breaking.md) —
  armories-normalizer: normalizeColosseums breaking 변경 (`deathmatch` 제거 + V9
  실키 추가) 및 normalizeCards Effects 정정 (2026-05-16)
- [ADR-0003](./ADR-0003-abyss-guardian-removal.md) — udp-service:
  abyss(도비스)/guardian(도가토) 명령 완전 제거. calendar API 실측(2026-05-16)
  결과 CategoryName 미출현 + 공식 엔드포인트 deprecated 확인 (2026-05-16)
- [ADR-0004](./ADR-0004-calendar-cache-reset-aligned-refresh.md) — 캘린더 캐시
  능동 갱신: 리셋정렬 단독 트랙(수요일 10:10 KST) + 비파괴적 `forceRefresh()`
  채택, 고정 인터벌 트랙과 `invalidate()+refetch` 는 기각. **설계 확정, 구현
  미착수 — 후속 세션** (2026-07-15)
- [ADR-0005](./ADR-0005-postgres-connection-retry-self-heal.md) — PostgreSQL
  연결 생명주기: 부팅 지수백오프 재시도(`connectWithRetry`) + 백그라운드
  self-heal(`startHealthCheck`) + lazy 재연결 single-flight(`ensureConnected`)
  채택. 인시던트(연결 확립 실패 시 영구 degraded) 근본 결함 수정, env 5종
  하위호환 default, 롤백은 env 토글로 즉시 가능 (2026-07-22)

## 템플릿

구조: Status / Context / Decision / Consequences / Alternatives considered /
References.
