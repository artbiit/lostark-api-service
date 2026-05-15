---
kind: graphify-meta
last_generated_at: 2026-05-16T03:50:00+09:00
source_commit: 7d5fed0b67027449633fcf4b1a118190d507cac1
scopes:
  - packages
  - docs
  - tests
  - legacy
---

# Graph — graphify 산출물 메타

이 디렉토리는 `/graphify` 가 생성하는 지식 그래프 산출물의 **메타 정보만**
커밋한다. HTML/JSON/audit 본체는 `.gitignore` 대상이며 재생성 가능하다.

## scope 정책

본 레포는 4개 분할 scope 로 graph 를 유지한다 (통합 `full` scope 는 2026-05-16
폐기).

- `packages` — `packages/*/src/` + 패키지 메타 (`package.json`, `tsconfig.json`,
  `dump-openapi.ts` 등). 4개 워크스페이스 (shared / data-service / rest-service
  / udp-service).
- `docs` — `docs/` 전체 (ADR, 아키텍처, contracts, development, work-log 등) +
  `docs/contracts/upstream-lostark-api/V9.0.0/sample-data/*` 의 JSON 샘플.
- `tests` — `tests/` 전체 (unit / integration / character-data / common helpers
  + README/MIGRATION-REPORT).
- `legacy` — `legacy/` (Node + MySQL 시절 KakaoTalk 봇 + `loa.sql` 스키마 +
  README).

scope 간 cross-link 가 필요하면 graph_merge 도구로 별도 분석 시 합치는 것을
원칙으로 한다 (커밋된 산출물은 분할 유지).

## 엔트리포인트 사용법

- 구조 탐색이 필요한 작업 전에 `last_generated_at` / `source_commit` 을
  확인한다.
- 낡았다고 의심되면 `graph-refresh-checker` 서브에이전트 호출.
- 판정이 `partial-stale` / `fully-stale` 이면 메인 에이전트가
  `/graphify <scope_path>` 로 해당 scope 만 재생성.
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

| scope    | 마지막 생성 | 소스 커밋 | 대상 경로                                             | 요약                                                                                                                                                                                                                            |
| -------- | ----------- | --------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| packages | 2026-05-16  | `7d5fed0` | `packages/`                                           | 966 nodes · 1,548 edges · 69 communities. 100 파일 (전부 code). AST-only (semantic 스킵). God nodes: ArmoriesCache, ArmoriesNormalizer, ApiClient, RestServer. 핵심 커뮤니티: Armories Cache / API Client + Rate Limiter / UDP Command Handlers / REST Server. |
| docs     | 2026-05-16  | `7d5fed0` | `docs/` (자기 자신 graph 산출물 제외)                 | 421 nodes · 454 edges · 46 communities. 81 파일 (61 doc + 20 sample JSON). 145 AST + 276 semantic. 핵심 커뮤니티: UDP Envelope & Client Sample / Normalizer ADRs & Tests / Verification Strategies / Agent Team Protocol Roles. |
| tests    | 2026-05-16  | `7d5fed0` | `tests/`                                              | 396 nodes · 610 edges · 29 communities. 39 파일 (35 code + 4 doc). 332 AST + 64 semantic. 핵심 커뮤니티: ArmoriesService Test Methods / Cache-Flow + Character Suites / Shared Env Test Suite / UDP Parser & Router Unit Tests. |
| legacy   | 2026-05-16  | `7d5fed0` | `legacy/`                                             | 239 nodes · 348 edges · 15 communities. 20 파일 (18 code + 2 doc + loa.sql). 192 AST + 47 semantic. 핵심 커뮤니티: Legacy commandUtils Helpers / Legacy Command Catalog / Legacy API Client / MySQL Schema Tables.              |

## 갱신 시 체크리스트

- [ ] frontmatter 의 `last_generated_at`, `source_commit`, `scopes` 갱신
- [ ] 위 "Scopes" 표에 한 줄 추가/갱신
- [ ] 폐기된 scope 가 있다면 해당 디렉토리 `Remove-Item -Recurse` + 표에서 제거
