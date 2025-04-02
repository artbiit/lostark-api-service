const logger = require("../../../libs/logger");
const api = require("../../../libs/API");
const cUtils = require("./commandUtils");
const utils = require("../../../libs/utils");
const fs = require("fs");
const moment = require("moment-timezone");
const mysql = global.mysql;

const procyonCategories = {
  "모험 섬": 0,
  유령선: 1,
  필드보스: 2,
  "태초의 섬": 3,
  카오스게이트: 4,
};
const procyonRewardList = ["실링", "골드", "주화", "카드"];
async function procyon() {
  let data = {};
  let now = new Date(moment.tz("Asia/Seoul"));
  let contents = await cUtils.selectTodaysRemainingContents();
  if (!contents) {
    const api_result = await api.gamecontents(api.gamecontents_types.calendar);
    if (api_result.status == 200) {
      await cUtils.upsertProcyon(api_result.data);
    } else {
      return api_result.comment;
    }
  }
  for (let d of await cUtils.selectTodaysRemainingContents()) {
    let category = d.CategoryName;
    if (procyonCategories[category] === undefined) {
      continue;
    }

    if (!Array.isArray(d.StartTimes)) {
      continue;
    }
    let start = new Date(moment.tz(d.StartTimes[0], "Asia/Seoul"));

    if (!data[category]) {
      data[category] = [];
    }

    data[category].push({
      name: d.ContentsName,
      level: d.MinItemLevel,
      date: start,
      rewardItems: d.RewardItems,
    });
  }

  if (Object.keys(data).length === 0) {
    return "금일 주요 콘텐츠는 더이상 없습니다.";
  }

  let result = [`${utils.dayToString(now)}의 프로키온의 나침반`];
  for (let key in data) {
    result.push(`\n[${key}] ${utils.remainingTime(data[key][0].date, now)}`);
    if (procyonCategories[key] === 0) {
      for (let d of data[key]) {
        let rewards = [];
        for (let r of d.rewardItems) {
          let reward = procyonRewardList.find(
            (value) => r.Name.indexOf(value) !== -1
          );
          if (reward && !rewards.includes(reward)) {
            rewards.push(reward);
          }
        }
        let txt = `${d.name} : ${rewards.join(",")}`;
        result.push(txt);
      }
    }
  }

  return result.join("\n");
}
async function notice(args) {
  const api_result = await api.news_notices();
  if (api_result.status !== 200) {
    return api_result.comment;
  }

  return JSON.stringify(api_result.data);
}

async function event(args) {
  const api_result = await api.news_events();
  if (api_result.status !== 200) {
    return api_result.comment;
  }

  let result = ["이벤트 정보"];
  let now = new Date();
  let index = 0;
  for (let event of api_result.data) {
    //let start = new Date(event.StartDate);
    let end = new Date(event.EndDate);
    let reward;
    if (event.RewardDate) {
      reward = new Date(event.RewardDate);
    }

    let remaining = (reward || end) - now > 0.0;
    if (!remaining) {
      //시간이 다 되었으면 통과
      continue;
    }

    result.push(`\n${++index}. ${event.Title}`);

    if (reward) {
      result.push(`보상 종료 : ${utils.remainingTime(reward, now)}`);
    } else {
      result.push(`남은 기간 : ${utils.remainingTime(end, now)}`);
    }
  }

  return result.join("\n");
}

async function challenge_abyss(args) {
  const api_result = await api.gamecontents(
    api.gamecontents_types.challengeAbyssDungeons
  );
  if (api_result.status !== 200) {
    return api_result.comment;
  }

  const data = api_result.data;
  let result = [];
  if (!data || data.length === 0) {
    result.push("읭");
  } else {
    result.push(`[금주의 도비스]`);
    result.push(`${data[0].AreaName}`);
  }

  return result.join("\n");
}

async function challenge_guardian(args) {
  const api_result = await api.gamecontents(
    api.gamecontents_types.challengeGuardianRaids
  );
  if (api_result.status !== 200) {
    return api_result.comment;
  }

  const data = api_result.data;
  let result = [];
  if (!data || data.Raids.length === 0) {
    result.push("읭");
  } else {
    result.push(`[금주의 도가토]`);
    for (let raid of data.Raids) {
      result.push(` ${raid.Name}`);
    }
  }

  return result.join("\n");
}

async function checkDataExistence() {
  const tables = [
    "Categories",
    "Contents",
    "RewardItems",
    "ContentStartTimes",
    "RewardStartTimes",
  ];
  let result = 0;

  for (const table of tables) {
    const [rows] = await mysql.query(`SELECT COUNT(*) as count FROM ${table}`);
    result += rows[0].count > 0;
  }

  return result === 0;
}
async function test() {
  global.mysql = await require("../../Mysql/MysqlService").create();
  await cUtils.deleteOldContents();
  const api_result = await api.gamecontents(api.gamecontents_types.calendar);
  if (api_result.status == 200) {
    await cUtils.upsertProcyon(api_result.data);
  }
  let result = await procyon();
  console.log(result);
}
test();

module.exports = {
  procyon,
  event,
  challenge_abyss,
  challenge_guardian,
};
