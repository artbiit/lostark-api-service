---
updated_at: 2026-05-16
session_id: 20260516-040536
---

# udp-service 카카오봇 모듈 구조

`packages/udp-service` 가 카카오톡 명령어 포맷팅 봇으로 승격된 이후의 모듈
토폴로지·envelope 계약·라우팅 흐름을 기록한다.

전체 시스템 맥락은 [system-overview.md](./system-overview.md) 참조.

## 역할

메신저봇R Android 클라이언트로부터 UDP 데이터그램을 수신하여, `!` 로 시작하는
카카오톡 명령어를 처리하고 plain-text 응답을 반환하는 내부망 전용 봇 서비스. API
호출은 `packages/data-service` 의 서비스 싱글톤을 통해 위임한다.

## 메시지 흐름

```
[메신저봇R Android]
    │  UDP datagram
    │  JSON: {event:"message", data:{room,sender,content,...}, session:"<uuid>"}
    ▼
[UdpServer.handleIncomingMessage]
    │  1. 크기 검증 + JSON.parse
    │  2. ClientEnvelopeSchema (zod) 파싱
    │     └─ 실패 → silent drop (warn 로그)
    │  3. LockFreeQueue.enqueue
    ▼
[WorkerPool → UdpWorker.processEnvelope]
    │  event === 'message' && content.startsWith(COMMAND_PREFIX)
    │     └─ 아닐 경우 → silent drop (no reply)
    ▼
[routing/parser.parseCommand]   →   { name, args, raw }
    ▼
[routing/router.dispatch]
    │  aliases 처리 (고민→vs, 명령어→도움말)
    │  unknown / disabled → silent drop
    │  minArgs 부족 → usage 텍스트 reply
    ▼
[commands/<group>/<name>.ts]
    │  ServiceContext (data-service 싱글톤 공유)
    ├─ armoriesService.getCharacterDetailPartial(...)
    ├─ charactersService.processCharacterSiblings(...)
    ├─ newsService.getActiveEvents()
    ├─ gameContentsService.getCalendar()
    ├─ auctionsService.searchItemsSimple(...)
    ├─ marketsService.searchItemsAdvanced(...)
    └─ redis.get/set  ← !랜전카 전용
    ▼
[formatters/<group>.ts + formatters/kakao.ts]   →   string
    ▼
[UdpServer.sendReply(session, text, remoteInfo)]
    │  JSON: {event:"reply:<session>", data: <string>}  → UDP send
    ▼
[메신저봇R: reply 매칭 → 카카오톡 답장]
```

**예외 처리 원칙**

1. zod 파싱 실패 / `event !== 'message'` / prefix 없음 → silent drop.
2. 미등록 명령(`!unknown`) → silent drop (다른 봇 prefix 충돌 회피).
3. 핸들러 내부 throw → 카카오 친화적 오류 메시지로 reply
   (`"<name> 은(는) 없는 것 같숨미당"`).

## 모듈 트리

```
packages/udp-service/src/
├── contracts/
│   └── envelope.ts            ClientEnvelopeSchema (zod), KakaoMessage 타입
├── routing/
│   ├── parser.ts              parseCommand(content, prefix) → ParsedCommand | null
│   └── router.ts              CommandSpec, CommandRegistry, createRouter
├── services/
│   └── service-context.ts     ServiceContext 빌더 (data-service 싱글톤 주입)
├── formatters/
│   ├── kakao.ts               padNumber/padString/sectionHeader/remainingTime/EMOJI
│   ├── armories.ts            11종 (정보/장비/스킬/보석/각인/돌/수집/착장/아바타/카드/전장)
│   ├── characters.ts          formatSiblings
│   ├── gamecontents.ts        formatProcyon/Event (Abyss/Guardian 제거 — ADR-0003)
│   ├── auctions.ts            formatGemSearch
│   └── markets.ts             formatExpensiveEngravings/formatEngravingSearch
├── commands/
│   ├── registry.ts            모든 CommandSpec 집계 → CommandRegistry
│   ├── armories/              (11 파일) profile/equipment/skills/gems/engravings/
│   │                          ability-stone/collectibles/avatars/avatar-url/cards/colosseums
│   ├── characters/            siblings.ts
│   ├── gamecontents/          procyon/event/category-map.ts (abyss/guardian 제거 — ADR-0003)
│   ├── auctions/              gems.ts
│   ├── markets/               expensive-engravings/legendary-engraving/relic-engraving.ts
│   ├── minigame/              dice/pick-one/share/synergy/synergy-text/
│   │                          random-card/card-list/fortune.ts
│   └── help/                  help.ts
└── server.ts                  (수정) ClientEnvelope 채택, WorkerPool → processEnvelope
```

## Envelope 계약

### 입력 (클라이언트 → 서버)

```typescript
// ClientEnvelopeSchema (zod)
{
  event: 'message',
  data: {
    room?: { name: string; id: string; isGroupChat?: boolean };
    sender: { name: string; hash: string };
    content: string;
    // containsMention?, time?, app? ...
  },
  session: string   // UUID — reply 라우팅 키
}
```

### 출력 (서버 → 클라이언트)

```typescript
{ event: `reply:${session}`, data: <kakaoText: string> }
```

기존 UdpMessage 4종(`character_detail`, `character_refresh`, `cache_status`,
`ping`)은 dead code 로 판정·폐기. →
[ADR-0001](../adr/ADR-0001-udp-envelope-adoption.md)

## Redis 캐시 키 (udp-service 전용)

| 키 패턴                                 | TTL                     | 용도                  |
| --------------------------------------- | ----------------------- | --------------------- |
| `udp:randomcard:<senderHash>:<KSTdate>` | KST 자정까지 (최대 24h) | !랜전카 하루 1회 고정 |

prefix `udp:` 는 data-service 의 `armories:`, `auctions:` 등과 분리된
udp-service 전용 네임스페이스.

## ServiceContext 공유 모델

```
WorkerPool (N workers)
    └── 모두 동일한 ServiceContext 인스턴스를 참조
         ├── armoriesService    (data-service 싱글톤)
         ├── charactersService  (data-service 싱글톤)
         ├── auctionsService    (data-service 싱글톤)
         ├── marketsService     (data-service 싱글톤)
         ├── gameContentsService(data-service 싱글톤)
         ├── newsService        (data-service 싱글톤)
         └── redis              (shared redisClient)
```

각 worker 가 독립 인스턴스를 가지면 캐시 일관성이 깨지므로, 모듈 레벨 싱글톤
공유 방식을 채택.

## 명령 등록 요약 (25종 + 재련 disabled)

> 2026-05-16: 도비스(`!도비스`)·도가토(`!도가토`) 제거 (27종 → 25종). 콘텐츠
> 게임 내 종료 확인. 상세 결정:
> [ADR-0003](../adr/ADR-0003-abyss-guardian-removal.md)

| 그룹                | 명령                                         | minArgs | 의존                            |
| ------------------- | -------------------------------------------- | ------- | ------------------------------- |
| armories (9종)      | 정보/장비/스킬/보석/각인/돌/수집/착장/아바타 | 1       | ArmoriesService                 |
| armories (신규 2종) | 카드/전장                                    | 1       | ArmoriesService                 |
| characters          | 부캐                                         | 1       | CharactersService               |
| gamecontents        | 프로키온/이벤트                              | 0       | GameContentsService/NewsService |
| auctions            | 보석값                                       | 1       | AuctionsService                 |
| markets             | 비싼유각/전각/유각                           | 0~1     | MarketsService                  |
| minigame            | 주사위/vs(고민)/분배금/시너지/랜전카/질문    | 0~2     | Redis(랜전카만)                 |
| help                | 도움말(명령어)                               | 0       | registry                        |
| ~~재련~~            | (disabled)                                   | —       | —                               |
| ~~도비스~~          | (removed — ADR-0003)                         | —       | —                               |
| ~~도가토~~          | (removed — ADR-0003)                         | —       | —                               |

## 관련 문서

- [system-overview.md](./system-overview.md) — 전체 3-tier 아키텍처
- [ADR-0001: envelope 채택](../adr/ADR-0001-udp-envelope-adoption.md)
- [ADR-0002: normalizer breaking 변경](../adr/ADR-0002-normalizer-colosseums-breaking.md)
- [ADR-0003: abyss/guardian 명령 완전 제거](../adr/ADR-0003-abyss-guardian-removal.md)
- [changes: 카카오봇 승격](../changes/2026-05-16-udp-service-kakao-bot-promotion.md)
- [changes: formatter 테스트 + abyss/guardian 제거](../changes/2026-05-16-formatter-tests-and-abyss-guardian-removal.md)
- [work-log: 세션 20260515-231420](../work-log/2026-05-16-udp-service-kakao-bot-promotion/index.md)
- [work-log: 세션 20260516-040536](../work-log/2026-05-16-carry-over-resolution/index.md)
- [client-sample: 메신저봇R 계약](../contracts/client-sample/client-sample.md)
