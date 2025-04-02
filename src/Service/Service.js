const test = require("./Commands/test");
const armories = require("./Commands/armories");
const env = require("../../libs/env");
const logger = require("../../libs/logger");
const { UDPServer } = require("@remote-kakao/core");
const prefix = env["PREFIX"];
const port = env["PORT"];
const server = new UDPServer({ serviceName: "lostark remote kakao" });
const help = require("./Commands/help");
const minigame = require("./Commands/mingame");
const character = require("./Commands/character");
const gamecontents = require("./Commands/gamecontents");
const auctions = require("./Commands/auctions");
const markets = require("./Commands/marckets");
require("../scheduler.js");

const handlers = {
  ping: { handler: test.ping, argsLength: 0 },
  정보: { handler: armories.profile, argsLength: 1 },
  도움말: { handler: help.help, argsLength: 0 },
  명령어: { handler: help.help, argsLength: 0 },
  장비: { handler: armories.equipments, argsLength: 1 },
  vs: { handler: minigame.pickOne, argsLength: 2 },
  고민: { handler: minigame.pickOne, argsLength: 2 },
  주사위: { handler: minigame.dice, argsLength: 0 },
  아바타: { handler: armories.avatar_url, argsLength: 1 },
  분배금: { handler: minigame.showMeTheMoney, argsLength: 1 },
  시너지: { handler: minigame.synergy, argsLength: 0 },
  스킬: { handler: armories.skills, argsLength: 1 },
  보석: { handler: armories.gems, argsLength: 1 },
  부캐: { handler: character.siblings, argsLength: 1 },
  랜전카: { handler: minigame.randomCard, argsLength: 0 },
  프로키온: { handler: gamecontents.procyon, argsLength: 0 },
  질문: { handler: minigame.fortuneTeller, argsLength: 0 },
  이벤트: { handler: gamecontents.event, argsLength: 0 },
  돌: { handler: armories.abilityStone, argsLength: 1 },
  보석값: { handler: auctions.search_gems, argsLength: 1 },
  비싼유각: { handler: markets.expensive_engravings, argsLength: 0 },
  전각: { handler: markets.search_legendary_engravings, argsLength: 1 },
  유각: { handler: markets.search_relics_engravings, argsLength: 1 },
  도비스: { handler: gamecontents.challenge_abyss, argsLength: 0 },
  도가토: { handler: gamecontents.challenge_guardian, argsLength: 0 },
  각인: { handler: armories.engravings, argsLength: 1 },
  수집: { handler: armories.collectibles, argsLength: 1 },
  착장: { handler: armories.avatar_equips, argsLength: 1 },
  //재련:{handler:minigame.reforgeGame, argsLength:0},
};

async function init() {
  server.once("ready", (port) => {
    console.log(`Server ready on port ${port}!`);
  });

  server.on("message", async (msg) => {
    msg.content = msg.content || "";
    if (!msg.content.startsWith(prefix)) return;

    const args = msg.content.split(" ");
    const cmd = args.shift()?.slice(prefix.length);
    const handler = handlers[cmd];

    if (handler && args.length >= handler.argsLength) {
      let result;
      try {
        result = await handler.handler(args, msg);
        if (!result) return;
        send = await msg.replyText(result);
      } catch (error) {
        logger.error(
          `Service.message. : ${error.message}\n${
            error.stack
          }\n\n${JSON.stringify(msg)}`
        );
        return;
      }
      logger.info(`Service.message. : ${result}\n\n${JSON.stringify(msg)}`);
    }
  });
  server.start(port);
}
module.exports = { init };
