---
id: ADR-0002
title: armories-normalizer — normalizeColosseums breaking 변경 및 normalizeCards Effects 정정
status: accepted
date: 2026-05-16
deciders: [design-advisor, user]
supersedes: null
superseded_by: null
---

# ADR-0002: armories-normalizer normalizeColosseums breaking 변경 및 normalizeCards Effects 정정

## Status

Accepted

## Context

`packages/data-service/src/normalizers/armories-normalizer.ts` 에 두 가지 결함이
있었다.

**결함 1 — normalizeCards: Effects 누락**

`normalizeCards` 는 카드 슬롯 배열(`Cards[]`)만 반환하고, 카드 세트 효과
(`Effects`) 를 완전히 무시했다. 반환 타입이 `Array<{slot, name, ...}>` 뿐이라
`!카드` 명령 구현 시 세트 효과 텍스트를 출력할 방법이 없었다.

**결함 2 — normalizeColosseums: deathmatch 키 매핑 오류**

`normalizeColosseums` 가 `deathmatch` 필드를 반환했으나, V9 API 응답에 해당 키가
존재하지 않아 항상 `undefined` 였다. 실제 API 가 반환하는 모드는
`CoOpBattle`, `OneDeathmatch`, `OneDeathmatchRank` 였다.

두 결함 모두 `!카드`, `!전장` 신규 명령 구현(세션 20260515-231420)을 위해
수정이 필요했다.

## Decision

### normalizeCards — 결과 타입을 `{cards, effects}` 형태로 확장

```typescript
// 변경 전
private normalizeCards(cardData: any): Array<{ slot, name, icon, awakeCount, awakeTotal, grade, tooltip }>

// 변경 후
private normalizeCards(cardData: any): {
  cards: Array<{ slot, name, icon, awakeCount, awakeTotal, grade, tooltip }>;
  effects: Array<{
    index: number;
    cardEffects: Array<{ index: number; description: string }>;
  }>;
}
```

빈 input (`cardData?.Effects` 없음) 시 `effects: []` 반환.

### normalizeColosseums — deathmatch 제거, V9 실 키 매핑 추가 (breaking)

```typescript
// 변경 전 — deathmatch 항상 undefined
Array<{ seasonName, competitive, teamDeathmatch, deathmatch, teamElimination }>

// 변경 후 — V9 실제 응답 키 반영
Array<{
  seasonName: string;
  competitive?: ColosseumRank;
  teamDeathmatch?: ColosseumRank;
  teamElimination?: ColosseumRank;
  coOpBattle?: ColosseumRank;        // 신규
  oneDeathmatch?: ColosseumRank;     // 신규 (deathmatch 대체)
  oneDeathmatchRank?: ColosseumRank; // 신규
}>
```

모든 모드를 optional 로 선언해 API 가 해당 모드를 반환하지 않는 경우 키 자체
생략.

## Consequences

**긍정적**

- `!카드` 명령에서 카드 세트 효과 텍스트 출력 가능.
- `!전장` 명령에서 실제 전장 전적 데이터 출력 가능 (기존엔 항상 undefined).
- normalizeColosseums 결과가 V9 API 실 응답과 일치.

**부정적 / 위험**

- `NormalizedCharacterDetail.colosseums` 의 `deathmatch` 필드 제거 — **breaking
  change**. 구현 전 `deathmatch` 참조 grep 실시, 사용처 없음(rest-service 라우트
  미구현) 확인 후 진행.
- `NormalizedCharacterDetail.cards` 반환 타입 변경 — 기존 `Array<…>` 에서
  `{cards, effects}` 로 변경. 마찬가지로 사용처 grep 후 안전 확인.
- OpenAPI dump diff 점검 의무 → 실행 결과 **no diff** (rest-service 라우트
  미구현이므로 OpenAPI 스펙에 노출 없음).

## Unit Test Coverage

- `tests/unit/data-service/normalizers/armories-cards.test.ts` — 3/3 pass
  - Effects 없을 때 빈 배열 반환
  - Effects 항목 정규화
  - 전체 구조 `{cards, effects}` 검증
- `tests/unit/data-service/normalizers/armories-colosseums.test.ts` — 4/4 pass
  - null 모드 생략
  - Competitive 노출
  - CoOpBattle/OneDeathmatch/OneDeathmatchRank 신규 모드 노출
  - deathmatch 키 부재 확인

## References

- 세션 work-log: [2026-05-16-udp-service-kakao-bot-promotion](../work-log/2026-05-16-udp-service-kakao-bot-promotion/index.md)
- 변경 이력: [changes/2026-05-16-udp-service-kakao-bot-promotion](../changes/2026-05-16-udp-service-kakao-bot-promotion.md)
- 설계 상세: `.claude/work-session/20260515-231420/design.md` §데이터 모델 (normalizer 정정)
