const commands = {
  접두사: "!",
  정보: "해당 캐릭터의 요약 정보",
  장비: "해당 캐릭터의 장비 정보",
  아바타: "해당 캐릭터의 아바타 url을 가져옵니다.",
  주사위: "0~100 or !주사위 5 10 -> 5~10",
  vs: "or 고민, 하나 골라주기",
  분배금: "경매장 수수료를 고려해 인원당 적정 입찰가",
  시너지: "딜러의 시너지 목록",
  스킬: "해당 캐릭터의 2레벨 이상의 스킬들",
  보석: "해당 캐릭터가 장착 보석",
  부캐: "해당 캐릭터와 같은 서버 캐릭 목록",
  랜전카: "하루 한번 전카 확인",
  프로키온: "금일 프로키온의 나침반 목록",
  질문: "그래 or 안돼",
  //"재련" : "재련 미니게임입니다.",
  이벤트: "진행중이거나 보상 기간이 남은 목록",
  보석값: "경매장에서 현 보석값 정보",
  비싼유각: "최저가 기준 상위 10개 유각 가격",
  유각: "유각 최저가를 검색해옵니다.",
  전각: "전각 최저가를 검색해옵니다.",
  도비스: "금주의 도전 어비스 던전",
  도가토: "금주의 도전 가디언 토벌 목록",
  각인: "해당 캐릭터가 장착 각인",
  수집: "해당 캐릭터 수집포인트",
  착장: "현 착용중인 아바타 목록",
};

let helpFullText = "";
//helpFullText = "[접두사] !";
for (let key in commands) {
  helpFullText += `[${key}] ${commands[key]}\n`;
}
helpFullText = helpFullText.substring(0, helpFullText.length - 1);

async function help(args) {
  if (!args || !args.length) return helpFullText;
  const c = commands[args[0]];
  if (c) return `[${args[0]}] ${c}`;
}

module.exports = {
  help,
};
