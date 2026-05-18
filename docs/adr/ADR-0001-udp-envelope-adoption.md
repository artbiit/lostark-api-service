---
id: ADR-0001
title: UDP envelope — 클라이언트 envelope 채택 및 UdpMessage 4종 폐기
status: accepted
date: 2026-05-16
deciders: [orchestrator, design-advisor, user]
supersedes: null
superseded_by: null
---

# ADR-0001: UDP envelope — 클라이언트 envelope `{event,data,session}` 채택 및 UdpMessage 4종 폐기

## Status

Accepted

## Context

`packages/udp-service` 는 서버 측 UdpMessage 를 4종의 type 으로 분류하는 자체
envelope(`{id, type, payload, timestamp}`) 을 사용했다. (`character_detail`,
`character_refresh`, `cache_status`, `ping`)

반면 실제 클라이언트인 메신저봇R Android 앱은
`{event: 'message', data: KakaoMessage, session: string}` 형태로만 송신했으며,
위 4종 type 을 보내는 코드는 repo 어디에도 존재하지 않았다. 즉 서버 측 4종
핸들러는 **dead code** 였다.

카카오톡 봇 승격 작업(세션 20260515-231420)에서 명령 파서·라우터를 신규 도입함에
따라, 어떤 envelope 을 권위 계약으로 삼을지 결정이 필요했다.

## Decision

클라이언트가 실제로 사용하는 `{event, data, session}` envelope 을 권위 계약으로
채택한다. 서버의 UdpMessage 4종 핸들러는 삭제한다.

입력 envelope 은 `packages/udp-service/src/contracts/envelope.ts` 에
`ClientEnvelopeSchema` (zod) 로 명세한다.

출력(reply) envelope 은 `{event: 'reply:<session>', data: <string>}` 형태를
유지한다 (legacy `reply:session` 패턴과 동일).

## Consequences

**긍정적**

- 클라이언트 변경 불필요 (이미 새 envelope 사용 중).
- Dead code 제거로 server.ts 단순화.
- 향후 메신저봇R 의 다른 event(`read`, `send_text` 등) 확장도 `event` 필드
  분기로 자연스럽게 수용 가능.

**부정적 / 위험**

- 기존 4종 type 을 호출하던 **미발견 외부 컨슈머** 가 있다면 즉시 깨짐. grep
  결과 repo 내 호출처 없음을 확인 후 결정.
- 내부망 전용 서비스라 외부 publish 없음 — 영향 범위 monorepo 한정.

## Alternatives Considered

| 안                                            | 이유로 기각                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| B: 기존 UdpMessage 유지 + `message` 타입 추가 | 클라이언트가 이미 `{event,data,session}` 를 보내므로 사실상 동작 불가. 어댑터 추가 비용 > 단순화 이득. |
| C: 양방향 호환 zod union                      | Dead code 유지 비용. 호출자 없는 4종을 위해 복잡도 지불 불합리.                                        |

## References

- 세션 work-log:
  [2026-05-16-udp-service-kakao-bot-promotion](../work-log/2026-05-16-udp-service-kakao-bot-promotion/index.md)
- 클라이언트 계약 샘플:
  [client-sample.md](../contracts/client-sample/client-sample.md)
- 설계 근거: `.claude/work-session/20260515-231420/design.md` §대안 비교
  (envelope 방향성)
