# Development — 개발 규칙 / 환경

재사용 가능한 개발 규칙 · 환경 세팅 · 워크플로우 문서가 여기 모인다.

## 기본 가이드

- [guide](./guide.md) — 개발 환경 설정 및 워크플로우
- [configuration](./configuration.md) — 환경변수 및 설정 상세
- [docker-setup](./docker-setup.md) — Docker 개발 환경 구성
- [documentation-guidelines](./documentation-guidelines.md) — 문서 작성/갱신
  규칙
- [document-category-classification](./document-category-classification.md) — 이
  `docs/` 카테고리 분류 기준
- [agent-team-protocol](./agent-team-protocol.md) — 에이전트 팀 운영 권위
  레퍼런스 (`/task` 진입)
- [verification-strategies](./verification-strategies.md) — 검증 사다리(L1~L4) +
  변경 범주별 의무 레벨 + 전략 레지스트리

## 워크플로우

- [workflows/README](./workflows/README.md) — 개발 프로세스 및 모범 사례 개요
- [workflows/development-workflow](./workflows/development-workflow.md)
- [workflows/gitflow](./workflows/gitflow.md)
- [workflows/code-review-checklist](./workflows/code-review-checklist.md)
- [workflows/best-practices](./workflows/best-practices.md)
- [workflows/troubleshooting-guide](./workflows/troubleshooting-guide.md)

## 에디터 규칙 (Cursor 등)

- [cursorrules/README](./cursorrules/README.md)
- [cursorrules/environment-variables](./cursorrules/environment-variables.md)

## 테스트

- [testing/cache-flow-test-results](./testing/cache-flow-test-results.md)
- [testing/final-test-results](./testing/final-test-results.md)

## 프로젝트 운영 상 특기

- Yarn Berry PnP 환경. `.pnp.cjs` 가 커밋된다.
- 모노레포(`packages/*`). 워크스페이스 스크립트는
  `yarn workspace @lostark/<name> <script>` 로 호출.
