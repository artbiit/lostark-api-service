const logger = require("../../../libs/logger");
const api = require("../../../libs/API");
const cUtils = require("./commandUtils");
const utils = require("../../../libs/utils");

async function expensive_engravings(args) {
  let info = {
    Sort: "CURRENT_MIN_PRICE",
    CategoryCode: 40000,
    ItemGrade: "유물",
    PageNo: 0,
    SortCondition: "DESC",
  };
  let api_result = await api.markets_items(info);

  if (api_result.status !== 200) {
    return api_result.comment;
  }

  let result = [];
  const data = api_result.data;
  if (!data || data.Items.length === 0) {
    result.push("각인서를 찾을 수 없습니다.");
  } else {
    result.push("[비싼 각인서]\n");
    for (let item of data.Items) {
      let name = item.Name;
      if (name.startsWith("[")) {
        name = name.substring(name.indexOf("] ") + 2);
      }
      name = name.replace(" 각인서", "");
      result.push(`[${name}] ${item.CurrentMinPrice.toLocaleString()}`);
    }
  }

  return result.join("\n");
}

async function search_engravings(args) {
  const [ItemGrade, ItemName] = args;

  let info = {
    Sort: "CURRENT_MIN_PRICE",
    CategoryCode: 40000,
    //CharacterClass: "string",
    //"ItemTier": null,
    ItemGrade,
    ItemName,
    PageNo: 0,
    SortCondition: "DESC",
  };
  let api_result = await api.markets_items(info);

  if (api_result.status !== 200) {
    return api_result.comment;
  }

  let result = [];
  const data = api_result.data;
  if (!data || data.Items.length === 0) {
    result.push("각인서를 찾을 수 없습니다.");
  } else {
    let item = data.Items[0];
    let name = item.Name;
    if (name.startsWith("[")) {
      name = name.substring(name.indexOf("] ") + 2);
    }
    name = name.replace(" 각인서", "");
    result.push(`[${name}] : ${item.CurrentMinPrice.toLocaleString()}`);
  }

  return result.join("\n");
}

async function search_legendary_engravings(args) {
  return await search_engravings(["전설", args[0]]);
}

async function search_relics_engravings(args) {
  return await search_engravings(["유물", args[0]]);
}

// async function test() {
//   global.env = require("../../../libs/env");

//   let result = await search_relics_engravings(["아드레날린"]);

//   console.log(result);
// }

// test();

module.exports = {
  expensive_engravings,
  search_engravings,
  search_legendary_engravings,
  search_relics_engravings,
};
