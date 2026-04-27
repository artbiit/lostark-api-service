# Sample Data - V9.0.0

이 디렉토리에는 로스트아크 API V9.0.0의 실제 응답 샘플 데이터가 포함되어
있습니다.

## 📁 디렉토리 구조

```
sample-data/
├── README.md                    # 이 파일
├── news/                        # 공지사항 및 이벤트
│   ├── notices.json             # 공지사항 목록 (11.73KB)
│   └── events.json              # 이벤트 목록 (5.11KB)
├── characters/                  # 캐릭터 정보
│   └── siblings.json            # 스트리머별 siblings API 응답 (61.8KB)
├── armories/                    # 캐릭터 상세 정보 (무기고)
│   ├── characters.json          # 캐릭터 요약 정보 (411.40KB)
│   ├── profiles.json            # 캐릭터 기본 능력치 (7.43KB)
│   ├── equipment.json           # 캐릭터 장비 정보 (76.63KB)
│   ├── avatars.json             # 캐릭터 아바타 정보 (35.06KB)
│   ├── combat-skills.json       # 캐릭터 전투 스킬 (150.22KB)
│   ├── engravings.json          # 캐릭터 각인 정보 (1.56KB)
│   ├── cards.json               # 캐릭터 카드 정보 (9.47KB)
│   ├── gems.json                # 캐릭터 보석 정보 (81.18KB)
│   ├── colosseums.json          # 캐릭터 증명의 전장 정보 (1.64KB)
│   └── collectibles.json        # 캐릭터 수집품 정보 (28.12KB)
├── auctions/                    # 경매장
│   ├── options.json             # 경매장 검색 옵션 (147.69KB)
│   └── items.json               # 경매장 아이템 검색 (5.51KB)
├── markets/                     # 시장 정보
│   ├── options.json             # 시장 검색 옵션 (2.48KB)
│   ├── items-by-id.json         # 아이템 ID로 시장 정보 조회 (3.01KB)
│   └── items.json               # 시장 아이템 검색 (0.05KB)
└── gamecontents/                # 게임 콘텐츠
    └── calendar.json            # 주간 콘텐츠 달력 (419.75KB)
```

## 📊 데이터 크기 요약

| API          | 파일               | 크기     | 설명                         |
| ------------ | ------------------ | -------- | ---------------------------- |
| NEWS         | notices.json       | 11.73KB  | 공지사항 목록                |
| NEWS         | events.json        | 5.11KB   | 이벤트 목록                  |
| CHARACTERS   | siblings.json      | 61.8KB   | 스트리머별 siblings API 응답 |
| ARMORIES     | characters.json    | 411.40KB | 캐릭터 요약 정보             |
| ARMORIES     | profiles.json      | 7.43KB   | 캐릭터 기본 능력치           |
| ARMORIES     | equipment.json     | 76.63KB  | 캐릭터 장비 정보             |
| ARMORIES     | avatars.json       | 35.06KB  | 캐릭터 아바타 정보           |
| ARMORIES     | combat-skills.json | 150.22KB | 캐릭터 전투 스킬             |
| ARMORIES     | engravings.json    | 1.56KB   | 캐릭터 각인 정보             |
| ARMORIES     | cards.json         | 9.47KB   | 캐릭터 카드 정보             |
| ARMORIES     | gems.json          | 81.18KB  | 캐릭터 보석 정보             |
| ARMORIES     | colosseums.json    | 1.64KB   | 캐릭터 증명의 전장 정보      |
| ARMORIES     | collectibles.json  | 28.12KB  | 캐릭터 수집품 정보           |
| AUCTIONS     | options.json       | 147.69KB | 경매장 검색 옵션             |
| AUCTIONS     | items.json         | 5.51KB   | 경매장 아이템 검색           |
| MARKETS      | options.json       | 2.48KB   | 시장 검색 옵션               |
| MARKETS      | items-by-id.json   | 3.01KB   | 아이템 ID로 시장 정보 조회   |
| MARKETS      | items.json         | 0.05KB   | 시장 아이템 검색             |
| GAMECONTENTS | calendar.json      | 419.75KB | 주간 콘텐츠 달력             |

## 🔍 데이터 수집 정보

- **수집 날짜**: 2025-01-15
- **API 버전**: V9.0.0
- **총 API 호출**: 20개
- **총 데이터 크기**: 1403.49KB
- **평균 응답 크기**: 70.17KB

## 📝 참고사항

- 모든 데이터는 실제 API 호출 결과입니다
- 캐릭터 관련 API는 스트리머 대표 캐릭터로 siblings API를 호출하여 실제 계정
  정보를 수집했습니다
- ARMORIES API는 모두 '이다' 캐릭터로 테스트했습니다
- MARKETS API는 '10레벨 홍염' 아이템(ID: 66110223)으로 테스트했습니다
- 일부 API는 더 이상 사용되지 않아 제거되었습니다 (도비스/도가토/길드 API)
- 데이터 크기는 UTF-8 인코딩 기준입니다
- Rate Limit 정보도 함께 수집되었습니다
