const api = require("../../../libs/API");
const utils = require("../../../libs/utils");
async function siblings(args) {
  let name = args[0];
  let api_result = await api.character_siblings(name);

  if (api_result.status !== 200) {
    return api_result.comment;
  }

  const data = api_result.data;
  if (data.length === 0) {
    return `${name} 캐릭터는 없는 것 같숨미당`;
  }

  let characters = {};
  let sameServer = "";
  const compareName = name.toUpperCase();
  for (let v of data) {
    let server = v.ServerName;
    if (!characters[server]) {
      characters[server] = [];
    }

    if (compareName === v.CharacterName.toUpperCase()) {
      sameServer = server;
    }

    characters[server].push({
      name: v.CharacterName,
      item_level: v.ItemMaxLevel,
      class: v.CharacterClassName,
      level: v.CharacterLevel,
    });
  }

  characters[sameServer].sort((a, b) => {
    if (a.item_level < b.item_level) return 1;
    else if (a.item_level > b.item_level) return -1;

    if (a.level < b.level) return 1;
    else if (a.level > b.length) return -1;

    if (a.class < b.class) return 1;
    else if (a.class > b.class) return -1;

    if (a.name < b.name) return 1;
    else if (a.name > b.name) return -1;

    return 0;
  });

  let result = [`<${name}님과 같은 ${sameServer} 서버 캐릭터들>`];
  for (let c of characters[sameServer]) {
    result.push(`[${c.class}] Lv.${c.level} (${c.item_level})\n\t${c.name}`);
  }

  return result.join("\n");
}

// async function test() {
//   //global.env = require("../../../libs/env");
//   //global.mysql = require("../../Mysql/MysqlService").create();
//   let result = await siblings(["meausa1"]);

//   console.log(result);
// }

//test();
module.exports = {
  siblings,
};
