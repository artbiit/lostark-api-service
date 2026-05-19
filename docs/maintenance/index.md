# Maintenance — 수동 운영 절차

정기/비정기로 사람이 수행하는 운영 작업.

## 목록

- [deployment](./deployment.md) — 배포 가이드 (Docker, 환경변수, 헬스체크)
- [host-node-run](./host-node-run.md) — macOS 호스트에서 Node 로 직접 실행 시
  절차 (CA prefix 필수) + 장애 원인 분리 가이드
- [macos-warp-tls-mitigation](./macos-warp-tls-mitigation.md) — macOS Cloudflare
  WARP 환경에서 컨테이너 외부 HTTPS 가 `certificate verify failed` 로 깨질 때
  Gateway CA mount 우회 절차

## 관련

- 개발 환경 Docker 세팅은 `development/docker-setup.md` (분리 유지: 개발용 자체
  compose vs 운영용 공유 인프라).
- 운영 오케스트레이션은 상위 레포 `loa-platform/docker-compose.yml` 가 담당.
