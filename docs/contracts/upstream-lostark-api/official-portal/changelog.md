---
source_url: https://developer-lostark.game.onstove.com/changelog
fetched_at: 2026-05-15T22:30:00+09:00
versions_documented: V1.0.0 through V10.0.0
---

# Lost Ark OpenAPI - CHANGELOG

Official portal: https://developer-lostark.game.onstove.com/changelog
Note: Exact release dates are not displayed on the changelog page.

---

## V10.0.0

### New
- POST /market/trades : Returns recently traded market items with search options

### Removed (ARMORIES)
- Removed PvpGradeName model from character profiles
- Removed Rank, PreRank, Exp models from colosseums endpoint

---

## V9.0.0

### New Data (ARMORIES)
- Added HonorPoint to character profiles
- New endpoint: GET /armories/characters/{characterName}/arkgrid

---

## V8.0.0

### New Data
- Added CombatPower to character profiles
- Added Decorations to character profiles
- Added Description field to ArkPassivePoint model

### Removed
- Removed ItemMaxLevel from character profiles
- Removed Level field from Tripods model in combat-skills

---

## V7.0.0

### Removed (GAMECONTENTS)
- Removed Challenge Abyss Dungeon endpoint
- Removed Challenge Guardian Raid endpoint

---

## V6.0.0

### New (NEWS)
- New endpoint: GET /news/alarms
  Returns public and personal alarm notifications

---

## V5.1.0

### New Data (ARMORIES - Colosseums)
- Added OneDeathmatch model to colosseums endpoint

### Removed (ARMORIES - Colosseums)
- Removed Deathmatch model from colosseums endpoint

---

## V5.0.0

### New Data (ARMORIES)
- Added SkillType field to combat-skills endpoint
- New endpoint: GET /armories/characters/{characterName}/arkpassive

### Removed (ARMORIES)
- Removed ArkPassive model from profiles endpoint (moved to dedicated /arkpassive endpoint)

---

## V4.0.0

### New Data
- Added ArkPassive and ArkPassiveEffects models
- Modified Effects structure in gems endpoint
- Auction options: added Tiers and Categories filters
- Changed data types in Options model

### Removed (GUILDS)
- Removed Guild ranking endpoint: GET /guilds/rankings

---

## V3.0.0

### New Endpoint (ARMORIES)
- GET /armories/characters/{characterName}
  Returns unified character data (all sub-resources in one call)

---

## V2.0.0

### New
- GET /news/notices
- GET /gamecontents/calendar
- GET /gamecontents/challenge-abyss-dungeons  (later removed V7.0.0)
- GET /gamecontents/challenge-guardian-raids  (later removed V7.0.0)

---

## V1.2.0

Incremental improvements to core endpoints.

## V1.1.0

Incremental improvements to core endpoints.

---

## V1.0.0  (Initial Release)

Core API surface launched:
- ARMORIES: profiles, equipment, avatars, combat-skills, engravings, cards, gems, colosseums, collectibles
- CHARACTERS: GET /characters/{characterName}/siblings
- AUCTIONS: GET /auctions/options, POST /auctions/items
- MARKETS: GET /markets/options, POST /markets/items, GET /markets/items/{itemId}
- NEWS: GET /news/events
- GUILDS: GET /guilds/rankings  (removed in V4.0.0)

---

## Summary: Removed Endpoints

Endpoint / Removed In
GET /guilds/rankings                              V4.0.0
GET /gamecontents/challenge-abyss-dungeons        V7.0.0
GET /gamecontents/challenge-guardian-raids        V7.0.0

## Summary: Key Schema Changes

Field / Endpoint / Change / Version
PvpGradeName               /armories/.../profiles       Removed     V10.0.0
Rank, PreRank, Exp         /armories/.../colosseums     Removed     V10.0.0
HonorPoint                 /armories/.../profiles       Added       V9.0.0
CombatPower, Decorations   /armories/.../profiles       Added       V8.0.0
ItemMaxLevel               /armories/.../profiles       Removed     V8.0.0
Level (in Tripods)         /armories/.../combat-skills  Removed     V8.0.0
OneDeathmatch              /armories/.../colosseums     Added       V5.1.0
Deathmatch                 /armories/.../colosseums     Removed     V5.1.0
SkillType                  /armories/.../combat-skills  Added       V5.0.0
ArkPassive (in profiles)   /armories/.../profiles       Removed     V5.0.0
Tiers, Categories          /auctions/options            Added       V4.0.0

