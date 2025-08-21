# ARMORIES API Sample Data

이 디렉토리에는 로스트아크 ARMORIES API V9.0.0의 실제 응답 샘플 데이터가
포함되어 있습니다.

## 📁 파일 목록

| 파일명             | 크기     | 설명                    | API 엔드포인트                                           |
| ------------------ | -------- | ----------------------- | -------------------------------------------------------- |
| characters.json    | 411.40KB | 캐릭터 요약 정보        | `GET /armories/characters/{characterName}`               |
| profiles.json      | 7.43KB   | 캐릭터 기본 능력치      | `GET /armories/characters/{characterName}/profiles`      |
| equipment.json     | 76.63KB  | 캐릭터 장비 정보        | `GET /armories/characters/{characterName}/equipment`     |
| avatars.json       | 35.06KB  | 캐릭터 아바타 정보      | `GET /armories/characters/{characterName}/avatars`       |
| combat-skills.json | 150.22KB | 캐릭터 전투 스킬        | `GET /armories/characters/{characterName}/combat-skills` |
| engravings.json    | 1.56KB   | 캐릭터 각인 정보        | `GET /armories/characters/{characterName}/engravings`    |
| cards.json         | 9.47KB   | 캐릭터 카드 정보        | `GET /armories/characters/{characterName}/cards`         |
| gems.json          | 81.18KB  | 캐릭터 보석 정보        | `GET /armories/characters/{characterName}/gems`          |
| colosseums.json    | 1.64KB   | 캐릭터 증명의 전장 정보 | `GET /armories/characters/{characterName}/colosseums`    |
| collectibles.json  | 28.12KB  | 캐릭터 수집품 정보      | `GET /armories/characters/{characterName}/collectibles`  |

## 📊 데이터 크기 분류

### 작은 데이터 (<10KB)

- **engravings.json** (1.56KB) - 캐릭터 각인 정보
- **colosseums.json** (1.64KB) - 캐릭터 증명의 전장 정보
- **profiles.json** (7.43KB) - 캐릭터 기본 능력치
- **cards.json** (9.47KB) - 캐릭터 카드 정보

### 중간 데이터 (10-100KB)

- **collectibles.json** (28.12KB) - 캐릭터 수집품 정보
- **avatars.json** (35.06KB) - 캐릭터 아바타 정보
- **equipment.json** (76.63KB) - 캐릭터 장비 정보
- **gems.json** (81.18KB) - 캐릭터 보석 정보

### 큰 데이터 (>100KB)

- **combat-skills.json** (150.22KB) - 캐릭터 전투 스킬
- **characters.json** (411.40KB) - 캐릭터 요약 정보

## 🔍 테스트 정보

- **테스트 캐릭터**: 이다 (스트리머)
- **테스트 날짜**: 2025-01-15
- **API 버전**: V9.0.0
- **총 데이터 크기**: 802.71KB

## 📝 참고사항

- 모든 데이터는 실제 API 호출 결과입니다
- 캐릭터 요약 정보(characters.json)가 가장 큰 데이터를 포함합니다
- 전투 스킬(combat-skills.json)은 스킬 트리 정보로 인해 큰 용량을 차지합니다
- 각인과 증명의 전장 정보는 상대적으로 작은 데이터입니다
- 데이터 크기는 UTF-8 인코딩 기준입니다
