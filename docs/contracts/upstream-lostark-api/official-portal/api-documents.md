---
source_url: https://developer-lostark.game.onstove.com/getting-started
fetched_at: 2026-05-15T22:30:00+09:00
api_version: V9.0.0 (project current) / V10.0.0 (latest changelog)
base_url: https://developer-lostark.game.onstove.com
---

# Lost Ark OpenAPI - API Documents

Official portal: https://developer-lostark.game.onstove.com/getting-started
Schema sourced from portal and packages/shared/src/types/V9/

---

## Getting Started

### Authentication

All API requests require a JWT Bearer token.

    Authorization: bearer {your_JWT}
    Accept: application/json

- Issue API KEY from MY CLIENTS page
- Up to 5 clients per account
- Terms of Use and Privacy Policy required

### Rate Limiting

- X-RateLimit-Limit: 100 (requests/minute)
- X-RateLimit-Remaining: remaining count
- X-RateLimit-Reset: unix timestamp

Default limit: 100 requests/minute. Exceeded: HTTP 429.
Increase: MY CLIENTS -> REQUEST FOR MONETIZATION & LIMIT INCREASE

### HTTP Status Codes

200 Success | 401 Unauthorized | 403 Forbidden | 404 Not Found
415 Unsupported Media Type | 429 Rate Limit Exceeded
500 Internal Server Error | 502 Bad Gateway | 503 Service Unavailable | 504 Gateway Timeout

---

## API Endpoints Summary

Method / Path / Description / Added
GET    /news/notices                                  Public notices                    V1.0.0
GET    /news/events                                   Event list                        V2.0.0
GET    /news/alarms                                   Public/personal alarms            V6.0.0
GET    /characters/{name}/siblings                    Account siblings                  V1.0.0
GET    /armories/characters/{name}                    Full armory data                  V3.0.0
GET    /armories/characters/{name}/profiles           Profile                           V1.0.0
GET    /armories/characters/{name}/equipment          Equipment                         V1.0.0
GET    /armories/characters/{name}/avatars            Avatars                           V1.0.0
GET    /armories/characters/{name}/combat-skills      Combat skills                     V1.0.0
GET    /armories/characters/{name}/engravings         Engravings (각인)                  V1.0.0
GET    /armories/characters/{name}/cards              Cards                             V1.0.0
GET    /armories/characters/{name}/gems               Gems                              V1.0.0
GET    /armories/characters/{name}/colosseums         Colosseum                         V1.0.0
GET    /armories/characters/{name}/collectibles       Collectibles                      V1.0.0
GET    /armories/characters/{name}/arkgrid            ArkPassive grid                   V9.0.0
GET    /auctions/options                              Auction search options            V1.0.0
POST   /auctions/items                               Search auction items               V1.0.0
GET    /markets/options                               Market search options             V1.0.0
POST   /markets/items                                Search market items                V1.0.0
GET    /markets/items/{itemId}                        Market item by ID                 V1.0.0
POST   /market/trades                                Recently traded items              V10.0.0
GET    /gamecontents/calendar                         Weekly content calendar           V2.0.0
GET    /gamecontents/challenge-abyss-dungeons         Challenge Abyss [DEPRECATED]      removed V7.0.0
GET    /gamecontents/challenge-guardian-raids         Challenge Guardian [DEPRECATED]   removed V7.0.0


---

## 1. NEWS

### GET /news/notices

Query Parameters:
- searchText (string, optional): Title search text
- type (string, optional): 공지 / 점검 / 상점 / 이벤트

Response: Notice[]
  Notice.Title: string
  Notice.Date: string  (ISO 8601 e.g. 2025-08-20T09:59:54.163)
  Notice.Link: string
  Notice.Type: 공지 or 점검 or 상점 or 이벤트

---

### GET /news/events

Response: Event[]
  Event.Title: string
  Event.Thumbnail: string
  Event.Link: string
  Event.StartDate: string  (ISO 8601)
  Event.EndDate: string  (ISO 8601)
  Event.RewardDate?: string  (optional)
  Event.RewardItems?: EventRewardItem[]
    EventRewardItem.Name: string
    EventRewardItem.Icon: string
    EventRewardItem.Grade: string
    EventRewardItem.StartTimes?: string[] or null

---

### GET /news/alarms  [Added V6.0.0]

Returns public and personal alarm notifications.

---

## 2. CHARACTERS

### GET /characters/{characterName}/siblings

Path Parameter: characterName (string, required) - URL-encoded

Response: CharacterSibling[]
  CharacterSibling.ServerName: 루페온/실리안/아만/카마인/카제로스/아브렐슈드/카단/니나브
  CharacterSibling.CharacterName: string
  CharacterSibling.CharacterLevel: number
  CharacterSibling.CharacterClassName: string
  CharacterSibling.ItemAvgLevel: string  (e.g. 1,460.00)


---

## 3. ARMORIES

### GET /armories/characters/{characterName}  [Added V3.0.0]

Full armory data - returns all sub-resources in one call.

Response: ArmoryCharacter
  .ArmoryProfile: ArmoryProfile
  .ArmoryEquipment: ArmoryEquipment[]
  .ArmoryEngraving: ArmoryEngraving
  .ArmoryCard: ArmoryCards
  .ArmoryGem: ArmoryGems
  .ArmorySkill: ArmoryCombatSkills
  .ArmoryAvatar: ArmoryAvatars
  .ArmoryColosseum: ArmoryColosseums
  .Collectibles: ArmoryCollectibles

---

### GET /armories/characters/{characterName}/profiles

Response: ArmoryProfile
  CharacterName: string
  ServerName: string
  CharacterClassName: string
  ItemAvgLevel: string  (e.g. 1,620.00)
  CharacterImage: string
  ExpeditionLevel: number
  PvpGradeName: string  [Removed V10.0.0]
  TownLevel: number
  TownName: string
  Title: string
  GuildMemberGrade: string
  GuildName: string
  UsingSkillPoint: number
  TotalSkillPoint: number
  Stats: Stat[]
    Stat.Type: string
    Stat.Value: string
    Stat.Tooltip: string[]
  Tendencies: Tendency[]
    Tendency.Type: string
    Tendency.Point: number
    Tendency.MaxPoint: number

---

### GET /armories/characters/{characterName}/equipment

Response: ArmoryEquipment[]
  Type: string (slot type)
  Name: string
  Icon: string
  Grade: string
  Tooltip: string  (JSON tooltip data)

---

### GET /armories/characters/{characterName}/avatars

Response: ArmoryAvatars
  Avatars: Avatar[]
    Avatar.Type/Name/Icon/Grade: string
    Avatar.IsSet: boolean
    Avatar.IsInner: boolean
    Avatar.Tooltip: string

---

### GET /armories/characters/{characterName}/combat-skills

Response: ArmoryCombatSkills
  CombatSkills: CombatSkill[]
    CombatSkill.Name/Icon: string
    CombatSkill.Level: number
    CombatSkill.Type: string  [SkillType added V5.0.0]
    CombatSkill.IsAwakening: boolean
    CombatSkill.Tripods: Tripod[]
      Tripod.Tier/Slot: number
      Tripod.Name/Icon: string
      Tripod.Level: number  [Removed V8.0.0]
      Tripod.IsSelected: boolean
    CombatSkill.Rune: {Name: string, Icon: string} or null

---

### GET /armories/characters/{characterName}/engravings

Response: ArmoryEngraving
  Engravings: Engraving[]
    Engraving.Slot: number
    Engraving.Name/Icon/Tooltip: string
  Effects: EngravingEffect[]
    EngravingEffect.Name: string
    EngravingEffect.Description: string

---

### GET /armories/characters/{characterName}/cards

Response: ArmoryCards
  Cards: Card[]
    Card.Slot: number
    Card.Name/Icon/Grade/Tooltip: string
    Card.AwakeCount/AwakeTotal: number
  Effects: CardSetEffect[]
    CardSetEffect.SetName/SetEffect: string
    CardSetEffect.SetCount: number

---

### GET /armories/characters/{characterName}/gems

Response: ArmoryGems
  Gems: Gem[]
    Gem.Slot/Level: number
    Gem.Name/Icon/Grade/Tooltip: string

---

### GET /armories/characters/{characterName}/colosseums

Note: V5.1.0 - OneDeathmatch added, Deathmatch removed
Note: V10.0.0 - Rank, PreRank, Exp removed

Response: ArmoryColosseums
  Colosseums: Colosseum[]
    Colosseum.SeasonName: string
    Colosseum.Competitive/TeamDeathmatch/TeamElimination: ColosseumRankInfo
    ColosseumRankInfo.Rank/ClassRank/Score/MaxScore: number
    ColosseumRankInfo.RankName/RankIcon/ClassRankName/ClassRankIcon: string

---

### GET /armories/characters/{characterName}/collectibles

Response: ArmoryCollectibles
  Collectibles: Collectible[]
    Collectible.Type/Icon: string
    Collectible.Point/MaxPoint: number
    Collectible.CollectiblePoints: CollectiblePoint[]
      CollectiblePoint.PointName: string
      CollectiblePoint.Point/MaxPoint: number

---

### GET /armories/characters/{characterName}/arkgrid  [Added V9.0.0]

Returns ArkPassive grid summary data.


---

## 4. AUCTIONS

### GET /auctions/options  (cache recommended)

Response: AuctionOptions
  MaxItemLevel: number
  ItemGradeQualities: number[]  (e.g. [10,20,30,40,50,60,70,80,90])
  SkillOptions: SkillOption[]
    SkillOption.Value: number
    SkillOption.Class/Text: string
    SkillOption.IsSkillGroup: boolean
    SkillOption.Tripods: TripodOption[]
      TripodOption.Value: number
      TripodOption.Text: string
      TripodOption.IsGem: boolean
      TripodOption.Tiers: number[]  (e.g. [2,3,4])

---

### POST /auctions/items

Request Body (AuctionSearchRequest):
  CategoryCode: number  [required]
  Sort: BUY_PRICE or BID_PRICE or END_DATE or ITEM_LEVEL  [required]
  SortCondition: ASC or DESC  [required]
  PageNo: number  [required]
  ItemName?: string
  ItemGrade?: string
  ItemTier?: number  [V4.0.0+]
  ItemLevelMin?: number
  ItemLevelMax?: number
  SkillOptions?: number[]
  EtcOptions?: number[]
  QualityValue?: number
  EnableSkillOptionFilter?: boolean
  EnableEtcOptionFilter?: boolean

Response (AuctionSearchResponse):
  PageNo/PageSize/TotalCount: number
  Items: AuctionItem[]
    AuctionItem.Name/Icon: string
    AuctionItem.Grade: ItemGrade
    AuctionItem.Tier?/Level?: number
    AuctionItem.GradeQuality?: number or null
    AuctionItem.AuctionInfo:
      StartPrice/BuyPrice/BidPrice/BidCount/BidStartPrice/TradeAllowCount: number
      EndDate: string  (ISO 8601)
      IsCompetitive: boolean
      UpgradeLevel?: number or null
    AuctionItem.Options: ItemOption[]
      ItemOption.Type/OptionName/ClassName?: string
      ItemOption.OptionNameTripod?: string
      ItemOption.Value: number
      ItemOption.IsPenalty: boolean
      ItemOption.IsValuePercentage?: boolean

---

## 5. MARKETS

### GET /markets/options  (cache recommended)

Same structure as AuctionOptions.
MarketSort: BUY_PRICE or BID_PRICE or END_DATE or ITEM_LEVEL or ITEM_GRADE

---

### POST /markets/items

Same request as AuctionSearchRequest (uses MarketSort).

Response (MarketSearchResponse):
  PageNo/PageSize/TotalCount: number
  Items: MarketItem[]
    MarketItem.Name/Icon: string
    MarketItem.Grade: ItemGrade
    MarketItem.Tier?/Level?/GradeQuality?: number
    MarketItem.MarketInfo:
      StartPrice/BuyPrice/BidPrice/BidCount/BidStartPrice/TradeAllowCount: number
      EndDate: string
      IsCompetitive: boolean
    MarketItem.Options: ItemOption[]

---

### GET /markets/items/{itemId}

Path: itemId (integer, required)
Response: MarketItemByIdResponse  ->  Item: MarketItem

---

### POST /market/trades  [Added V10.0.0]

Returns recently traded market items with search options.

---

## 6. GAMECONTENTS

### GET /gamecontents/calendar  (cache recommended)

Weekly content calendar - Procyon Compass.

Response: GameContent[]
  GameContent.CategoryName: string
    Values: 모험 섬 / 유령선 / 필드보스 / 태초의 섬 / 카오스게이트 / 로웬 / 도비스 던전 / 도가토
  GameContent.ContentsName/ContentsIcon/Location: string
  GameContent.MinItemLevel: number
  GameContent.StartTimes: string[]  (ISO 8601 array)
  GameContent.RewardItems: RewardItemGroup[]
    RewardItemGroup.ItemLevel: number
    RewardItemGroup.Items: RewardItem[]
      RewardItem.Name/Icon: string
      RewardItem.Grade: ItemGrade
      RewardItem.StartTimes?: string[] or null

---

### GET /gamecontents/challenge-abyss-dungeons  [DEPRECATED - removed V7.0.0]
### GET /gamecontents/challenge-guardian-raids  [DEPRECATED - removed V7.0.0]

---

## Common Types

ItemGrade: 일반 / 고급 / 희귀 / 영웅 / 전설 / 유물 / 고대 / 에스더
NoticeType: 공지 / 점검 / 상점 / 이벤트
ServerName: 루페온 / 실리안 / 아만 / 카마인 / 카제로스 / 아브렐슈드 / 카단 / 니나브

---

## Endpoints Recommended for Caching

- GET /news/events
- GET /auctions/options
- GET /markets/options
- GET /gamecontents/calendar

