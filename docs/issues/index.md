# Issues — 운영/빌드 장애 대응

실제 발생한 장애 · 이슈와 그 대응을 기록한다. "어떻게 고쳤는가" 보다 **"같은 문제를 다시 만나지 않기 위한 맥락"** 을 남긴다.

## 목록

- [eslint-pnp-issue](./eslint-pnp-issue.md) — Yarn Berry PnP 환경에서 ESLint 동작 이슈
- [troubleshooting-old](./troubleshooting-old.md) — 구 `Docs/troubleshooting/Index.md` 의 종합 트러블슈팅 모음 (Redis 설정, 포트 충돌, Husky pre-push/PnP 등). **이슈별로 분리 예정**.

## 작성 요령

- 증상 / 재현 조건 / 원인 / 조치 / 재발 방지책 순으로.
- 유사 이슈가 반복되면 `backlog/` 에 구조적 대응 항목을 추가.
- `troubleshooting-old.md` 의 각 섹션은 독립 이슈 파일로 분리하면서 점진적으로 비운다.
