const axios = require("axios");
const logger = require("./logger");
const env = require("../libs/env");

const methods = {
  post: "post",
  get: "get",
  put: "put",
  delete: "delete",
};
Object.freeze(methods);

const config = {
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${env["api_key"]}`,
    "content-Type": "application/json",
  },
};

async function request(api, body, method) {
  let job;
  method = method || methods.get;
  try {
    job = await axios({
      url: `${env["base_url"]}${api}`,
      method: method,
      data: body,
      headers: config.headers,
    });
  } catch (error) {
    if (error.response) {
      job = error.response;
    }
    logger.error(`API.request. : api:${api}\n${error}`);
  }

  const limit = job?.headers["x-ratelimit-limit"]; //분당 최대 요청
  const remaining = job?.headers["x-ratelimit-remaining"]; //현 남은 횟수
  let reset = job?.headers["x-ratelimit-reset"];

  if (reset) {
    reset = Number(reset) * 1000;
    reset = new Date(reset);
  }

  logger.info(
    `API.request. : api:${api}, result:${job.status}\n[${remaining}/${limit}] reset : ${reset}`
  );

  switch (job.status) {
    case 200:
      break;
    case 401:
      job.comment = "API 키가 잘못되었습니다. 개발자에게 알려주세요.";
      break;
    case 403:
      job.comment = "권한 문제가 발생했으니 개발자에게 알려주세요.";
      break;
    case 429:
      job.comment = "API 사용량이 다했습니다. 1분 후 재시도해주세요.";
      break;
    case 500:
      job.comment = "API 서버에 문제가 발생했습니다. 나중에 재시도해주세요.";
      break;
    case 503:
      job.comment = "로스트아크 점검시간입니다.";
      break;
    default:
      job.comment = "API 요청 중 문제가 발생했습니다.";
      break;
  }
  return job;
}

/** 공지사항 목록을 반환합니다. */
async function news_notices(searchText, type) {
  return await request(
    "news/notices",
    { searchText: searchText, type: type },
    methods.get
  );
}

/** 진행 중인 이벤트 목록을 반환합니다. */
async function news_events() {
  return await request("news/events", {}, methods.get);
}

/** 계정의 모든 캐릭터 프로필을 반환합니다.*/
async function character_siblings(characterName) {
  const job = await request(
    `characters/${characterName}/siblings`,
    {},
    methods.get
  );
  return job;
}

const armories_types = {
  summary: "", //캐릭터의 프로필 정보 요약을 반환합니다.
  profiles: "profiles", //캐릭터의 기본 능력치 요약을 반환합니다.
  equipment: "equipment", //캐릭터의 장착된 아이템의 요약을 반환합니다.
  avatars: "avatars", //캐릭터의 장착된 아바타의 요약을 반환합니다.
  combat_skills: "combat-skills", //캐릭터의 전투 스킬 요약을 반환합니다.
  engrabings: "engrabings", //캐릭터의 장착된 각인서를 반환합니다.
  cards: "cards", //캐릭터의 장착된 카드를 반환합니다.
  gems: "gems", //캐릭터의 장착된 보석을 반환합니다.
  colosseums: "colosseums", //캐릭터의 증명의 전장 정보를 반환합니다.
  collectibles: "collectibles", //캐릭터의 수집품 정보를 반환합니다.
};
Object.freeze(armories_types);

/** type으로 명시된 캐릭터 요약정보를 반환해옵니다. */
async function armories_character(characterName, type) {
  //각 정보는  null이 될수있음을 유의해야함
  const job = await request(
    `armories/characters/${characterName}/${type}`,
    {},
    methods.get
  );
  return job;
}
/** 경매장 검색 옵션을 반환합니다. */
async function auctions_options() {
  return await request(`auctions/options`, {}, methods.get);
}

async function auctions_items(requestAuctionItems) {
  return await request(`auctions/items`, requestAuctionItems, methods.post);
}

const servers = {
  lufeon: "루페온",
  cillian: "실리안",
  aman: "아만",
  carmine: "카마인",
  cajeros: "카제로스",
  abrelshud: "아브렐슈드",
  kadan: "카단",
  ninav: "니나브",
};
/** 해당 서버의 길드 순위를 반환합니다. */
async function guilds_rankings(server) {
  return await request(`guilds/rankings?serverName=${server}`, {}, methods.get);
}

/** 시장 검색 옵션을 반환합니다. */
async function markets_options() {
  return await request(`markets/options`, {}, methods.get);
}
/** itemID를 이용해 시장 정보를 불러옵니다. */
async function markets_items_itemid(itemId) {
  return await request(`markets/items/${itemId}`, {}, methods.get);
}

/**검색 옵션을 통해 시장 정보를 불러옵니다. */
async function markets_items(requestMarketItems) {
  return await request(`markets/items`, requestMarketItems, methods.post);
}

gamecontents_types = {
  challengeAbyssDungeons: "challenge-abyss-dungeons", // 이번주 도비스 목록
  challengeGuardianRaids: "challenge-guardian-raids", // 이번주 도가토 목록
  calendar: "calendar", // 이번 주 달력 목록
};
/** content에 해당하는 콘텐츠 정보를 불러옵니다. */
async function gamecontents(content) {
  return await request(`/gamecontents/${content}`, {}, methods.get);
}

// async function test() {
//   let result = await guilds_rankings("아만");
//   const json = JSON.stringify(result.data);
//   console.log(json);
//   const fs = require("fs");
//   fs.writeFileSync("./a.txt", json);
// }

// test();
module.exports = {
  news_notices,
  news_events,
  character_siblings,
  armories_character,
  armories_types,
  auctions_items,
  auctions_options,
  servers,
  guilds_rankings,
  markets_items,
  markets_items_itemid,
  markets_options,
  gamecontents_types,
  gamecontents,
};
