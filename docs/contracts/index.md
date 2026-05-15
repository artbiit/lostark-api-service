# Contracts — 인터페이스 계약

이 서비스가 노출하는 / 의존하는 HTTP 인터페이스.

## 자체 제공 REST API

`packages/rest-service` 가 제공한다. 소스 오브 트루스는 Fastify 라우트에 선언된
스키마 / `@fastify/swagger` 데코레이션이며, 아래 절차로 정적 스펙을 배포한다.

- **런타임 Swagger UI**: `GET /docs` (개발/디버깅용)
- **정적 OpenAPI YAML**: `yarn workspace @lostark/rest-api dump:openapi` → 기본
  출력 `../loa-platform/contracts/lostark-api.openapi.yaml`
- 이 산출물이 **공유 계약 저장소** (`loa-platform` 레포) 의 단일 출처. 모든
  소비자(Discord 봇 등) 는 해당 YAML 을 기준으로 타입을 생성한다.

현재 미채움 영역: response body 스키마 상당수. 라우트에 Zod/JSON Schema 를
추가해 자동 반영되도록 개선 예정.

## 상위 로스트아크 공식 API 참조

- [upstream-lostark-api/](./upstream-lostark-api/README.md) —
  developer-lostark.game.onstove.com 의 공식 스펙(V9.0.0 기준) 과 샘플 응답
  데이터. 이 서비스가 래핑/캐싱 대상으로 삼는 원천.

## 클라이언트 샘플

- [client-sample/](./client-sample/client-sample.md) — 소비자 측 사용 예제 코드
  (언어/프레임워크 중립적 HTTP 호출 레벨)

## 갱신 흐름

1. `packages/rest-service` 에 라우트/스키마 추가
2. `yarn workspace @lostark/rest-api dump:openapi` 실행
3. 결과 YAML 을 `loa-platform` 레포에 커밋
4. 각 소비자 레포에서 타입 재생성

호환성 깨는 변경은 반드시 `docs/changes/` 에 기록.
