CREATE TABLE IF NOT EXISTS `notice` ( -- 공지 Table
	seq_no	INT NOT NULL AUTO_INCREMENT,
    title TINYTEXT,
    notice_date DATETIME,
    link TEXT, -- URL은 65535 길이까지 생각해둬야 함
    notice_type varchar(10),
    PRIMARY KEY(seq_no)
);

CREATE TABLE IF NOT EXISTS `event` ( -- 이벤트 table
	seq_no	INT NOT NULL AUTO_INCREMENT,
    title TINYTEXT,
    thumbnail_url TEXT,
    link TEXT,
    start_date DATETIME,
    end_date DATETIME,
    RewardDate DATETIME,
    PRIMARY KEY(seq_no)
);

CREATE TABLE IF NOT EXISTS guild(
	seq_no INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(30) NOT NULL,
    PRIMARY KEY(seq_no),
    UNIQUE(`name`)
);


CREATE TABLE IF NOT EXISTS `character`(
	seq_no INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(30) NOT NULL,
    `class_name` SET("UNKNOWN","","마법사(여)","바드", "서머너", "아르카나", "소서리스", "전사(남)", "버서커", "워로드", "홀리나이트", "디스트로이어", "무도가(여)", "인파이터", "배틀마스터", "기공사", "창술사", "무도가(남)", "스트라이커", "헌터(남)", "데빌헌터", "블래스터", "호크아이", "스카우터", "헌터(여)", "건슬링어", "암살자(여)", "데모닉", "블레이드", "리퍼", "소울이터", "스페셜리스트", "도화가", "기상술사", "전사(여)", "슬레이어") NOT NULL,
    title TINYTEXT, -- 칭호
    expedition_level smallint,
    pvp_grade_name VARCHAR(10),
    char_level TINYINT NOT NULL, -- 전투 레벨
    using_skill_point SMALLINT NOT NULL, -- 사용한 스킬 포인트
    total_skill_point SMALLINT NOT NULL, -- 보유중인 스킬 포인트
    item_avg_level VARCHAR(10) NOT NULL, -- 장착 중인 아이템 레벨
    item_max_level VARCHAR(10) NOT NULL, -- 최대 아이템 레벨
    `server` SET ("UNKNOWN","","루페온", "실리안", "아만", "카마인", "카제로스", "아브렐슈드", "카단", "니나브") NOT NULL,
    guild_id INT,
    guild_grade VARCHAR(28),
    town_name VARCHAR(30), -- 영지 명
    image_url TEXT, -- 아바타 이미지 url
    last_update DATETIME,
    PRIMARY KEY(seq_no)
 );

CREATE TABLE IF NOT EXISTS `character_sibling` (
	seq_no	INT NOT NULL AUTO_INCREMENT, -- 클러스터링 인덱스
	server_name VARCHAR(26) NOT NULL, -- 서버
    character_id INT NOT NULL, -- 캐릭 기본 정보
    class_name VARCHAR(20) NOT NULL, -- 직업
    group_id INT NOT NULL, -- 같은 계정 그룹
    PRIMARY KEY(seq_no)
);

CREATE TABLE IF NOT EXISTS `sibling_group` ( -- 같은 계정 캐릭터 끼리 묶어 놓고 언제 업데이트했는지 확인하기 위함
	group_id INT NOT NULL, -- character_sibling.group_id
    last_update DATETIME NOT NULL, -- 마지막 업데이트 시점
    PRIMARY KEY(group_id)
);

CREATE TABLE IF NOT EXISTS `stats`(
 seq_no	INT NOT NULL AUTO_INCREMENT, -- 클러스터링 인덱스
 character_id INT NOT NULL,
 `type` SET("UNKNOWN", "", "치명", "신속", "특화", "제압", "인내", "숙련", "최대 생명력", "공격력") NOT NULL,
 `value` INT NOT NULL,
 PRIMARY KEY(seq_no)
);

CREATE TABLE IF NOT EXISTS `tendencies`(
seq_no	INT NOT NULL AUTO_INCREMENT, -- 클러스터링 인덱스
character_id INT NOT NULL,
`type` SET("UNKNOWN", "", "지성", "담력", "매력", "친절") NOT NULL,
`value` SMALLINT NOT NULL,
PRIMARY KEY(seq_no)
);

CREATE TABLE IF NOT EXISTS `equipment`(
seq_no	INT NOT NULL AUTO_INCREMENT, -- 클러스터링 인덱스
character_id INT NOT NULL,
`name` VARCHAR(100) NOT NULL, -- 아이템 명
slot_type SET("UNKNOWN", "", "무기", "투구", "상의", "하의", "장갑", "어깨", "목걸이", "귀걸이", "반지", "어빌리티 스톤", "팔찌", "나침반", "부적") NOT NULL, -- 장착 부위
upgrade_level TINYINT NOT NULL, -- 재련 단계
item_level SMALLINT NOT NULL, -- 아이템 레벨
quality TINYINT NOT NULL, -- 품질
item_grade TINYINT NOT NULL, -- 아이템 등급 (유물, 고대)
set_type SET("UNKNOWN", "", "지배", "갈망", "파괴", "매혹", "사멸", "악몽", "환각", "구원", "배신", "구원") NOT NULL,
set_level TINYINT NOT NULL,
transcendence_level TINYINT NOT NULL, -- 초월 단계
transcendence_count TINYINT NOT NULL, -- 초월 등급 갯수
elixir_0 INT NOT NULL, -- 첫번째 엘릭서 효과
elixir_0_level TINYINT NOT NULL, -- 첫번째 엘릭서 레벨
elixir_1 INT NOT NULL, -- 두번째 엘릭서 효과
elixir_1_level TINYINT NOT NULL, -- 두번째 엘릭서 레벨
advanced_reforge TINYINT NOT NULL, -- 상급 재련 수치
PRIMARY KEY(seq_no)
);

CREATE TABLE IF NOT EXISTS `elixir`( -- 엘릭서 테이블
seq_no INT NOT NULL AUTO_INCREMENT,
name VARCHAR(50) NOT NULL, -- 세트 명칭
slot_type SET("UNKNOWN", "", "투구", "상의", "하의", "장갑", "어깨", "공용") NOT NULL,
PRIMARY KEY(seq_no)
);

CREATE TABLE IF NOT EXISTS skill(
	seq_no INT NOT NULL AUTO_INCREMENT,
    character_id INT NOT NULL,
    level TINYINT NOT NULL, -- 스킬 이름
    rune_name VARCHAR(20), -- 착용 중인 룬 이름
    rune_grade TINYINT NOT NULL, -- 룬 등급
    PRIMARY KEY(seq_no)
);

CREATE TABLE IF NOT EXISTS tripod(
		seq_no INT NOT NULL AUTO_INCREMENT, 
        tier TINYINT NOT NULL, -- 트라이포드 티어
        slot TINYINT NOT NULL, -- 트라이포드 슬롯
        name VARCHAR(100) NOT NULL, -- 트라이포드 이름
		PRIMARY KEY(seq_no)
);

CREATE TABLE IF NOT EXISTS selected_tripod(
	seq_no INT NOT NULL AUTO_INCREMENT,
	level TINYINT NOT NULL, -- 트라이포드 레벨
    tripod_id INT NOT NULL, -- 트라이포드 아이디
    skill_id INT NOT NULL, -- 스킬 아이디
	PRIMARY KEY(seq_no)
);

CREATE TABLE IF NOT EXISTS `dailyRandomCard` ( -- 랜전카 명령어
	seq_no INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL, -- 카톡 닉네임
    `index` TINYINT NOT NULL,
    PRIMARY KEY(seq_no)
);


CREATE TABLE IF NOT EXISTS reforgeGame( -- 재련 게임
	seq_no INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL, -- 카톡 닉네임
    `level` TINYINT NOT NULL,
    probability DOUBLE NOT NULL,
    last_reforge DATETIME NOT NULL,
    PRIMARY KEY(seq_no)
);

CREATE TABLE IF NOT EXISTS abilityStone( -- 어빌리티 스톤 테이블
 seq_no INT NOT NULL AUTO_INCREMENT,
 character_id INT NOT NULL,
 activity_name VARCHAR(50) NOT NULL, -- 효과 이름
 activity_value TINYINT NOT NULL, -- 효과 활성도
 activity_type boolean NOT NULL, -- true - 상승, false - 감소
  PRIMARY KEY(seq_no)
);

CREATE TABLE IF NOT EXISTS engraving( -- 각인
 seq_no INT NOT NULL AUTO_INCREMENT,
 character_id INT NOT NULL,
 name VARCHAR(50) NOT NULL, -- 효과 이름
 level TINYINT NOT NULL, -- 효과 활성도
 job_only boolean NOT NULL, -- 직업 전용인지
  PRIMARY KEY(seq_no)
);

CREATE TABLE IF NOT EXISTS collectibles( -- 수집포인트
 seq_no INT NOT NULL AUTO_INCREMENT,
 character_id INT NOT NULL,
 type SET('모코코 씨앗', '섬의 마음', '위대한 미술품', '거인의 심장', '이그네아의 징표', '세계수의 잎', '오르페우스의 별', '기억의 오르골', '항해 모험물') NOT NULL, -- 효과 이름
 point SMALLINT NOT NULL, -- 효과 활성도
 percent FLOAT NOT NULL, -- 직업 전용인지
  PRIMARY KEY(seq_no)
);

SELECT * FROM collectibles;


-- 장비 정보 기입
INSERT INTO equipment (character_id, name, slot_type, upgrade_level, item_level, quality, item_grade, set_type, set_level, transcendence_level, transcendence_count, elixir_0, elixir_1) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?);
-- 장비 정보 탐색
SELECT character_id, name, slot_type, upgrade_level, item_level, quality, item_grade, set_type, set_level, transcendence_level, transcendence_count, elixir_0, elixir_1 FROM equipment WHERE character_id = ?;
-- 엘릭서 정보 기입
INSERT INTO elixir(name, slot_type) VALUES (?,?);
-- 엘릭서 정보 탐색
SELECT name, slot_type, level FROM elixir WHERE seq_no = ?;
-- 엘릭서 정보로 탐색
SELECT seq_no FROM elixir WHERE name = ? AND slot_type = ?;
--  캐릭 정보 있는지 불러오기
SELECT title, class_name, char_level, expedition_level, pvp_grade_name, using_skill_point, total_skill_point, item_avg_level, item_max_level, server, guild_id, guild_grade, town_name, image_url, last_Update FROM `character` WHERE `name` = ?;
-- 캐릭 정보 기입용
INSERT INTO `character` (`name`, title, class_name,char_level, expedition_level, pvp_grade_name, using_skill_point, total_skill_point, item_avg_level, item_max_level, `server`, guild_id, guild_grade, town_name, image_url, last_update) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);
-- 길드 정보 있는지
SELECT seq_no FROM guild WHERE `name` = ?;
-- 길드 정보 기입
INSERT INTO guild (`name`) VALUES (?);
-- 스탯 정보 기입 
 INSERT INTO `stats` (character_id, `type`, `value`) VALUES (?,?,?);
 -- 스탯 정보 수정
UPDATE `stats` SET `value` = ? WHERE character_id = ? AND `type` = ?;
 -- 스탯 정보 검색
 SELECT * FROM `stats` WHERE character_id = 1 ORDER BY value ;
 -- 어빌리티 스톤 삭제
 DELETE FROM abilityStone WHERE character_id = ?;

SELECT * FROM abilityStone;

CREATE TABLE IF NOT EXISTS Categories (
    CategoryID INT AUTO_INCREMENT PRIMARY KEY,
    CategoryName VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS Contents (
    ContentID INT AUTO_INCREMENT PRIMARY KEY,
    CategoryID INT,
    ContentsName VARCHAR(255) NOT NULL,
    ContentsIcon VARCHAR(255),
    MinItemLevel INT,
    Location VARCHAR(255),
    FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID)
);

CREATE TABLE IF NOT EXISTS RewardItems (
    RewardItemID INT AUTO_INCREMENT PRIMARY KEY,
    ContentID INT,
    Name VARCHAR(255) NOT NULL,
    Icon VARCHAR(255),
    Grade VARCHAR(255),
    FOREIGN KEY (ContentID) REFERENCES Contents(ContentID)
);

CREATE TABLE IF NOT EXISTS ContentStartTimes (
    StartTimeID INT AUTO_INCREMENT PRIMARY KEY,
    ContentID INT,
    StartTime DATETIME,
    FOREIGN KEY (ContentID) REFERENCES Contents(ContentID)
);

CREATE TABLE IF NOT EXISTS RewardStartTimes (
    RewardStartTimeID INT AUTO_INCREMENT PRIMARY KEY,
    RewardItemID INT,
    StartTime DATETIME,
    FOREIGN KEY (RewardItemID) REFERENCES RewardItems(RewardItemID)
);
