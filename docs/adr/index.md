# ADR — Architecture Decision Records

되돌리기 어려운 결정을 번호제로 기록한다. **append-only**. 결정을 뒤집을 때는 새
ADR 을 발행하고 supersede 관계를 명시한다.

## 목록

_기존 프로젝트(v1 → v2.0.0 전환) 시기의 결정은 명시적 ADR 문서로 남아 있지 않다.
이후 중요한 결정(캐시 전략 변경, 인증 도입, 스택 업그레이드 등) 부터
`ADR-NNNN-<slug>.md` 로 기록한다._

## 템플릿

구조: Status / Context / Decision / Consequences / Alternatives considered /
References.
