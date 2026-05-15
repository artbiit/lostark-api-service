# lostark-remote-kakao 문서 인덱스

로스트아크 원격 API (developer-lostark.game.onstove.com) 를 **Fastify 기반 HTTP
서비스로 래핑 · 캐싱 · 재노출** 하는 독립 서비스. 여러 소비자(Discord 봇, 웹
대시보드 등) 의 공통 백엔드 역할을 한다.

**docs-first 워크플로우**: 어떤 작업이든 이 파일을 먼저 읽고, 해당 카테고리의
`index.md` 를 거쳐 구체 문서로 들어간다.

> 작성/갱신 규칙과 카테고리 분류 기준은
> `development/documentation-guidelines.md` +
> `development/document-category-classification.md` 를 따른다.

## 카테고리

| 경로                                     | 용도                                                                    | 인덱스                                           |
| ---------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------ |
| [adr/](./adr/index.md)                   | 되돌리기 어려운 아키텍처/기술 결정 (불변, 번호제)                       | [adr/index.md](./adr/index.md)                   |
| [analysis/](./analysis/index.md)         | 성능/캐시/리스크 분석 결과                                              | [analysis/index.md](./analysis/index.md)         |
| [architecture/](./architecture/index.md) | 시스템 경계, 3-tier 캐시, Fastify 플러그인 구조                         | [architecture/index.md](./architecture/index.md) |
| [backlog/](./backlog/index.md)           | 미채택 아이디어, 재검토 트리거                                          | [backlog/index.md](./backlog/index.md)           |
| [changes/](./changes/index.md)           | 실제 동작이 바뀐 구현 변경 이력                                         | [changes/index.md](./changes/index.md)           |
| [contracts/](./contracts/index.md)       | 자체 제공 REST API 스펙, 상위 로스트아크 공식 API 참조, 클라이언트 샘플 | [contracts/index.md](./contracts/index.md)       |
| [development/](./development/index.md)   | 개발 환경, 설정, Docker, 워크플로우, 테스트, 에디터 규칙                | [development/index.md](./development/index.md)   |
| [domain/](./domain/index.md)             | 로스트아크 게임 도메인 지식, 스트리머 연구                              | [domain/index.md](./domain/index.md)             |
| [issues/](./issues/index.md)             | 운영/빌드 장애 대응 기록                                                | [issues/index.md](./issues/index.md)             |
| [maintenance/](./maintenance/index.md)   | 배포, 수동 운영 절차                                                    | [maintenance/index.md](./maintenance/index.md)   |
| [security/](./security/index.md)         | 인증/인가, 레이트 리밋, 개인정보 정책                                   | [security/index.md](./security/index.md)         |
| [work-log/](./work-log/index.md)         | 세션 간 handoff, 시점성 있는 작업 메모                                  | [work-log/index.md](./work-log/index.md)         |
| [graph/](./graph/index.md)               | **자동 생성** — graphify 산출물 메타                                    | [graph/index.md](./graph/index.md)               |

## 빠른 참조

- **제공 API 스펙**: `contracts/` (자체 `openapi.yaml` dump 흐름 포함)
- **상위 로스트아크 공식 API**: `contracts/upstream-lostark-api/`
- **아키텍처 / 캐시 설계**: `architecture/`
- **기술 선택 근거**: `adr/`
- **장애 이력**: `issues/`

## 작업 시작 체크리스트

- [ ] 이 인덱스에서 관련 카테고리를 식별했는가?
- [ ] 해당 카테고리 `index.md` 를 읽었는가?
- [ ] 구조 탐색이 필요한 작업이라면 `graph/index.md` 의 last_generated_at 이
      최근인지 확인했는가? 오래됐다면 `graph-refresh-checker` 에이전트 호출
      판단.
- [ ] 작업 결과로 새 문서가 필요한가? (분류 기준은
      `development/document-category-classification.md`)

## 외부 참조

- [LostArk Developer Portal](https://developer-lostark.game.onstove.com/)
- [LostArk API Changelog](https://developer-lostark.game.onstove.com/changelog)
