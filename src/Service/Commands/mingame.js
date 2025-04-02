const logger = require("../../../libs/logger");
const api = require("../../../libs/API");
const cUtils = require("./commandUtils");

async function dice(args) {
  let start = Math.ceil(Number(args[0] || 0));
  let end = Math.floor(Number(args[1] || 100));
  let result = Math.floor(Math.random() * (end - start + 1) + start);
  return `주사위 결과 : ${result}`;
}

async function pickOne(args) {
  if (args.length < 2) {
    return;
  }

  let result = args[Math.floor(Math.random() * args.length)];
  return `당연히 ${result}!`;
}

async function showMeTheMoney(args) {
  let gold = Number(args[0] || 0);
  if (!gold) {
    return;
  }

  const population = [4, 8, 16];
  let result = `입력된 금액 : ${gold}`;
  gold *= 0.95;
  result += ` -> ${gold}`;
  for (let p of population) {
    result += `\n${p}인 기준 : ${Math.floor(gold * ((p - 1.0) / p))}`;
  }

  console.log(result);
  return result;
}

const synergy_txt = `✔ 치명타 관련
치확 🡆 배마, 건슬, 알카, 데헌, 스커, 기상
치피 🡆 창술
✔ 공격력 / 피해량 증가
공증 🡆 기공, 스카
사멸 🡆 워황, 블레
무력 🡆 디트, 인파, 블래
✔ 적에게 부여하는 디버프
피증 🡆 소울, 소서, 버서, 모닉, 호크, 브커, 인파, 슬레
방감 🡆 워황, 서머, 블래, 디트, 리퍼, 환수
✔ 속도 관련 시너지
공속 🡆 배마, 블레, 스커, 기상
이속 🡆 배마, 블레, 호크, 기상`;

async function synergy(args) {
  return synergy_txt;
}

let cards = [
  "니나브",
  "바훈투르",
  "샨디",
  "실리안",
  "아제나&이난나",
  "에스더 갈라투르",
  "일리아칸",
  "가디언 루 카드",
  "광기를 잃은 쿠크세이튼",
  "국왕 실리안",
  "데런 아만",
  "베아트리스",
  "아만",
  "에스더 루테란",
  "에스더 시엔",
  "웨이",
  "진저웨일",
  "카마인",
];

async function randomCard(args, msg) {
  let name = msg.sender.name;
  let index = Math.floor(Math.random() * cards.length);
  index = await cUtils.checkRandomCard(name, index);
  const card = cards[index];
  return `${name}님의 오늘의 랜전카\n${card}`;
}

async function fortuneTeller(args, msg) {
  let name = msg.sender.name;
  let rand = Math.random() > 0.5;
  if (rand) {
    return `그 ${name} 래`;
  }

  return `안 ${name} 돼`;
}

async function reforgeGame(args, msg) {
  if (args.length === 0) {
    return "상태 : 재련 레벨과 확률을 알려줍니다.\n도전 : 재련을 시도합니다. 마지막 실패로부터 1시간이 지나야 가능합니다.";
  }

  let name = msg.sender.name;
  let data = await cUtils.checkReforgeGame(name);
  if (args.length !== 0) {
    let now = new Date();
    let timeDiff = now.getTime() - data.last_reforge.getTime();
    let hour = 60 * 60 * 1000;
    let isAllow = timeDiff >= hour;
    let probability = (data.probability * 100.0).toFixed(2);
    let remaining = Math.floor((hour - timeDiff) / (60 * 1000));
    switch (args[0]) {
      case "상태":
        return `${name}님의 재련 상태\n단계 : ${
          data.level
        }\n확률 : ${probability}%\n도전 : ${
          isAllow ? "가능합니다." : `${remaining}분 후에 가능합니다.`
        }`;
      case "도전":
        if (isAllow) {
          let rand = Math.random();
          if (rand <= data.probability) {
            //성공
            data.probability *= 0.8;
            data.level++;
            probability = (data.probability * 100.0).toFixed(2);
            await cUtils.updateReforgeGame(name, data);
            return `${name}님 재련 성공!\n다음 단계 : ${data.level}\n다음 확률 : ${probability}%`;
          } else {
            //실패
            data.last_reforge = now;
            await cUtils.updateReforgeGame(name, data);
            return `${name}님의 재련은 실패하였습니다...`;
          }
        } else {
          return `${name}님의 재련은 ${remaining}분 후에 가능합니다.`;
        }
    }
  }
}

module.exports = {
  dice,
  pickOne,
  showMeTheMoney,
  synergy,
  randomCard,
  fortuneTeller,
  reforgeGame,
};
// async function tesT(){
//     global.mysql = require("../../Mysql/MysqlService").create();
//    let result = await reforgeGame(["상태"], { sender : {name : "*&^&*^&"}});
//    console.log(result);
// }

// tesT();
