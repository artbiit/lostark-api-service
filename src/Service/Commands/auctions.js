const logger = require("../../../libs/logger");
const api = require("../../../libs/API");
const cUtils = require("./commandUtils");
const utils = require("../../../libs/utils");

async function search_gems(args, msg) {
  let itemName = args.join(" ");
  const info = {
    CategoryCode: 210000,
    Sort: "BUY_PRICE",
    SortCondition: "ASC",
    ItemName: itemName,
    PageNo: 0,
  };
  let api_result = await api.auctions_items(info);
  if (api_result.status !== 200) {
    return api_result.comment;
  }

  const data = api_result.data;
  let result = [];
  if (!data || data.Items.length === 0) {
    result.push(`${msg.sender.name}님 못찾았슴미다.`);
  } else {
    let item = data.Items[0];
    result.push(`[${item.Name}] 검색 결과`);
    result.push(`[최저가] : ${item.AuctionInfo.BuyPrice}`);
    const maxCount = 10;
    const count = maxCount > data.length ? data.length : maxCount;
    const searchedList = [];
    let sum = 0;
    let avg = 0;
    for (let i = 0; i < count; i++) {
      item = data.Items[i];
      sum += item.AuctionInfo.BuyPrice;
      searchedList.push(
        ` ${item.AuctionInfo.BuyPrice} (${item.Options[0].ClassName})`
      );
    }

    avg = sum / count;
    result.push(`[평균가] : ${avg}`);

    result.push(`\n\n최저가 ${count}개 목록\n${searchedList.join("\n")}`);
  }
  return result.join("\n");
}

// async function test() {
//   global.env = require("../../../libs/env");
//   let args = "10레벨 홍염".split(" ");
//   let result = await search_gems(args);

//   console.log(result);
// }

// test();

module.exports = {
  search_gems,
};
