---
kind: graphify-meta
last_generated_at: 2026-04-27T11:00:00+09:00
source_commit: f637d3271329635afb4114c620d1852968b65605
scopes:
  - full
---

# Graph — graphify 산출물 메타

이 디렉토리는 `/graphify` 가 생성하는 지식 그래프 산출물의 **메타 정보만** 커밋한다. HTML/JSON/audit 본체는 `.gitignore` 대상이며 재생성 가능하다.

## scope 후보

- `rest-service` — Fastify 라우트/플러그인/스키마
- `data-service` — 공식 API 호출 / 3-tier 캐시
- `shared` — env/logger/공통 타입
- `full` — 네 패키지(shared/data-service/rest-service/udp-service) + docs/contracts 통합 (현재 유일 scope)

## 엔트리포인트 사용법

- 구조 탐색이 필요한 작업 전에 `last_generated_at` / `source_commit` 을 확인한다.
- 낡았다고 의심되면 `graph-refresh-checker` 서브에이전트 호출.
- 판정이 `partial-stale` / `fully-stale` 이면 메인 에이전트가 `/graphify` 호출해 재생성.
- 폐기된 scope 의 산출물은 재생성 전에 **삭제**.

## 산출물 레이아웃

```
docs/graph/
├── index.md               # 이 파일 — 메타, 커밋 대상
├── .gitignore             # 본체 무시
└── <scope>/               # scope 별 산출물 디렉토리 (무시됨)
    ├── GRAPH_REPORT.md    # plain-language audit
    ├── graph.html         # 인터랙티브 viz
    ├── graph.json         # GraphRAG-ready 원본
    ├── manifest.json      # detect() 결과 (--update 대조용)
    ├── cost.json          # 누적 토큰 비용
    └── cache/             # 파일별 추출 캐시 (--update 가속)
```

## Scopes

| scope | 마지막 생성 | 소스 커밋 | 대상 경로 | 요약 |
| --- | --- | --- | --- | --- |
| full | 2026-04-27 | `f637d32` | 레포 전체 (packages/*/src + docs + tests + legacy) | 848 nodes · 1068 edges · 67 communities. God nodes: RestServer, ArmoriesNormalizer, CacheOptimizer. 3-Tier Cache / 3-Service Architecture / OpenAPI Pipeline 이 핵심 하이퍼엣지. |

## 갱신 시 체크리스트

- [ ] frontmatter 의 `last_generated_at`, `source_commit`, `scopes` 갱신
- [ ] 아래 "Scopes" 표에 한 줄 추가/갱신
- [ ] 폐기된 scope 가 있다면 해당 디렉토리 `rm -rf` + 표에서 제거
