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

## 템플릿

구조: Status / Context / Decision / Consequences / Alternatives considered /
References.
