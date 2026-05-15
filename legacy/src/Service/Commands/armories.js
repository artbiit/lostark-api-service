const logger = require('../../../libs/logger');
const api = require('../../../libs/API');
const cUtils = require('./commandUtils');
const utils = require('../../../libs/utils');
const fs = require('fs');
async function profile(args) {
  try {
    await parseCharacterInfo(args[0]);
  } catch (error) {
    logger.error(`profile parse error :\n${error.stack}`);
    return;
  }
  return createProfileResult(args[0]);
}

async function createProfileResult(name) {
  if (!name) {
    return `캐릭터를 찾을 수 없습니다`;
  }
  let result = [];

  const character = await cUtils.selectCharacter(name);
  const [stats, stones, engravings, tendencies] = await Promise.all([
    cUtils.selectStats(character.seq_no),
    cUtils.selectAbilityStone(character.seq_no),
    cUtils.selectEngraving(character.seq_no),
    cUtils.selectTendencies(character.seq_no),
  ]);

  if (character.title) {
    result.push(`${character.title} ${name}`);
  } else {
    result.push(`${name}`);
  }

  //TODO : 직업전용 노드 추가해야함
  if (engravings && engravings.length !== 0) {
    result.push(`${character.realization_name} ${character.class_name}`);
  } else {
    result.push(character.class_name);
  }

  let eTxt = ['', '', ''];
  for (let e of engravings) {
    eTxt[0] += e.name[0] + ' '; // 한글 뒤에 한 칸 공백 추가
    eTxt[1] += e.grade[0] + ' '; // 한 칸 공백 추가
    eTxt[2] += ' ' + e.level + ' '; // 숫자 앞뒤로 공백 추가
  }

  if (engravings.length !== 0) result.push(`\n${eTxt[0]}\n${eTxt[1]}\n${eTxt[2]}`);

  let isPowerStone = 0;
  if (stones.length > 0) {
    isPowerStone = stones?.reduce((acc, val) => {
      if (!val.activity_type) {
        return acc.activity_value + val.activity_value;
      } else {
        return acc;
      }
    });
  }
  if (isPowerStone >= 16) {
    result.push(`"${stones[0].activity_value}${stones[1].activity_value}돌 오우너"`);
  }
  result.push('');
  result.push(
    `템/전/원\t${character.item_avg_level}/${character.char_level}/${character.expedition_level}`,
  );
  if (character.guild_id) {
    result.push(
      `서버/길드\t${character.server}/${character.guild_name}의 ${character.guild_grade}`,
    );
  } else {
    result.push(`서버/길드\t${character.server}/없음`);
  }

  if (stats) {
    result.push(
      `전투특성\t${stats[2].type[0]}:${stats[2].value} ${stats[3].type[0]}:${stats[3].value}`,
    );
  } else {
    result.push(`전투특성\t없음`);
  }

  result.push(`스킬포인트\t${character.using_skill_point}/${character.total_skill_point}`);
  result.push(`pvp\t${character.pvp_grade_name}`);
  result.push(`공격력/체력\t${stats[1].value}/${stats[0].value}`);

  const totalElixirLevel = await cUtils.selectTotalElixirLevel(character.seq_no);
  const totalTranscendenceCount = await cUtils.selectTotalTranscendenceCount(character.seq_no);
  result.push(
    `엘/초/상\t${totalElixirLevel}/${totalTranscendenceCount}/${await cUtils.selectTotalAdvancedReforge(
      character.seq_no,
    )}`,
  );
  result.push(
    `진/깨/도\t${character.ark_passive_evolution}/${character.ark_passive_realization}/${character.ark_passive_leap}`,
  );

  //지성/담력/친절/매력
  for (let i = 0; i < tendencies.length; i += 2) {
    let t1 = tendencies[i];
    let t2 = tendencies[i + 1];
    result.push(`${t1.type}/${t2.type}\t${t1.value}/${t2.value}`);
  }

  result.push(`\n\n갱신된 시간 ${utils.elapsedTime(character.last_update)}`);
  return result.join('\n');
}

async function parseCharacterInfo(characterName, forceParse) {
  const now = new Date();
  let character = await cUtils.selectCharacter(characterName);
  let needParse = cUtils.isNeedParse(character, now);
  if (forceParse === true) {
    needParse = true;
  }
  let api_result = {};
  if (!needParse) {
    api_result.characterId = character.seq_no;
    api_result.status = 200;
    api_result.data = {};
    return api_result;
  }
  api_result = await api.armories_character(characterName, api.armories_types.summary);

  if (api_result.status !== 200) {
    return api_result;
  }
  let data = api_result.data;
  //fs.writeFileSync("./a.txt", JSON.stringify(data));
  let profile = data.ArmoryProfile;
  let guildId = await cUtils.checkGuild(profile.GuildName);
  let characterId = await cUtils.upsertCharacter(
    characterName,
    profile,
    data.ArkPassive,
    guildId,
    now,
  );
  api_result.characterId = characterId;
  let jobs = [];
  jobs.push(cUtils.upsertStats(characterId, profile.Stats));
  jobs.push(cUtils.upsertTendencies(characterId, profile.Tendencies));
  jobs.push(cUtils.upsertEquipments(characterId, data.ArmoryEquipment));
  jobs.push(cUtils.upsertAbilityStone(characterId, data.ArmoryEquipment));
  jobs.push(cUtils.upsertEngraving(characterId, data.ArmoryEngraving));
  jobs.push(cUtils.upsertCollectibles(characterId, data.Collectibles));
  await Promise.all(jobs);
  return api_result;
}
async function equipments(args) {
  const name = args[0]; //캐릭터명
  await parseCharacterInfo(name, true);
  const result = await createEquipmentsResult(name);
  return result;
}

async function createEquipmentsResult(name) {
  const character = await cUtils.selectCharacter(name);
  const equipments = await cUtils.selectEquipments(character.seq_no);

  let result = [];
  result.push(`<${name}의 장비>`);
  let qualitySum = 0;
  let elixirSum = 0;
  let transcendenceSum = 0;
  let advancedReforgeSum = 0;

  for (let eq of equipments) {
    var str = `+${eq.upgrade_level}(${String(eq.quality).padStart(3, '0')}) ${
      eq.slot_type
    }(${eq.evolution_level}) ${String(eq.item_level).padStart(4, '0')}`;

    if (eq.transcendence_level) {
      str += ` ⚜️${String(eq.transcendence_count).padStart(2, '0')}`;
    }

    if (eq.advanced_reforge > 0) {
      str += ` 🔱${String(eq.advanced_reforge).padStart(2, '0')}`;
    }

    result.push(str);
    qualitySum += eq.quality;
    transcendenceSum += eq.transcendence_count;
    elixirSum += eq.elixir_0_level + eq.elixir_1_level;
    advancedReforgeSum += eq.advanced_reforge;
  }
  result.splice(1, 0, `아이템 레벨 : ${character.item_avg_level}`);
  result.splice(2, 0, `평균 품질 : ${(qualitySum / equipments.length).toFixed(2)}`);
  result.splice(3, 0, `초월⚜️합계 : ${transcendenceSum}`);
  result.splice(4, 0, `상재🔱합계 : ${advancedReforgeSum}\n`);

  if (elixirSum) {
    result.push('\n<엘릭서 정보>');
    let elixir = await cUtils.selectElixir(character.seq_no);
    for (let key in elixir) {
      let e = elixir[key];
      let txt = `- ${key}) `;
      for (let info of e) {
        let name = info.name;
        if (name.indexOf('(') > -1) {
          name = name.split(' ')[0];
        } else if (name.length > 5 && name.indexOf(' ') > -1) {
          let arg = (name = name.split(' '));
          name = `${arg[0].at(0)}${arg[1].at(0)}`;
        }

        txt += `${name} Lv.${info.level} `;
      }
      result.push(txt);
    }
    result.splice(3, 0, `엘릭서 합계 : ${elixirSum}`);
  }
  result.push(`\n갱신된 시간 ${utils.elapsedTime(character.last_update)}`);
  return result.join('\n');
}

async function avatar_url(args) {
  const name = args[0];
  await parseCharacterInfo(name);
  let row = await cUtils.selectAvatarLink(name);
  if (row && row.image_url) {
    return `${name}의 아바타\n${row.image_url}`;
  }

  return `${name}의 아바타를 찾지 못했습니다.`;
}

async function skills(args) {
  const name = args[0];

  let api_result = await parseCharacterInfo(name);
  if (api_result.status !== 200) {
    return api_result.comment;
  }

  if (!api_result.data) {
    return `${name}을 찾을 수 없습니다.`;
  }

  const skills = api_result.data.ArmorySkills;
  let result = [`<${name}의 스킬>`];
  let tripods = {};
  for (let skill of skills) {
    if (skill.Level <= 1) continue;
    let txt = '';

    txt += `Lv.${skill.Level}${skill.Level < 10 ? '  ' : ' '}${skill.Name}`;
    if (skill.Rune) {
      txt += ` [${skill.Rune.Grade[0]} ${skill.Rune.Name}] `;
    }
    result.push(txt);

    for (let t of skill.Tripods) {
      if (t.IsSelected === false) {
        continue;
      }

      if (!tripods[skill.Name]) {
        tripods[skill.Name] = [];
      }
      tripods[skill.Name].push({
        name: t.Name,
        level: t.Level,
        slot: t.Slot,
      });
    }
  }

  const keys = Object.keys(tripods);
  if (keys.length > 0) {
    let max = Math.max(...keys.map((str) => str.length));
    result.push(`\n<트라이포드 정보>`);
    for (let key of keys) {
      let t = tripods[key];
      let txt = `[${key}] `;

      let args = ['', '']; // 트포 슬롯, 레벨
      for (let value of t) {
        args[0] += value.slot;
        args[1] += value.level;
      }
      txt += `${args[0]}/${args[1]}`;
      result.push(txt);
    }
  }
  return result.join('\n');
}

async function gems(args) {
  let name = args[0];
  let api_result = await parseCharacterInfo(name, true);
  if (api_result.status !== 200) {
    return api_result.comment;
  }

  if (!api_result.data) {
    return `${name}을 찾을 수 없습니다.`;
  }
  let data = api_result.data.ArmoryGem.Gems;

  //fs.writeFileSync("./c.txt", utils.removeHtmlTag(JSON.stringify(data)));

  let result = [`<${name}의 보석>`];
  let info = [];
  for (let key of Object.keys(data)) {
    const g = data[key];

    let tooltip = JSON.parse(utils.removeHtmlTag(g['Tooltip']));
    let level;
    let gemName;
    let isImputed;
    let effect;
    let tier;

    for (let key of Object.keys(tooltip)) {
      const element = tooltip[key];
      switch (element.type) {
        case 'NameTagBox':
          gemName = element.value.split(' ')[1].replace('의', '');
          isImputed = element.value.includes('귀속');
          break;
        case 'ItemTitle':
          level = element.value.slotData.rtString.replace('Lv.', '');
          level = Number(level);
          tier = element.value.leftStr2;
          tier = tier[tier.length - 1];
          tier = Number(tier);
          break;
        case 'ItemPartBox':
          effect = element.value.Element_001;
          break;
      }
    }

    let find = '] ';
    let index = effect.indexOf(find) + find.length;
    effect = effect.substring(index);

    const validEffects = ['피해', '재사용', '지원'];
    let effectIndex = validEffects.map((m) => effect.indexOf(m)).filter((i) => i !== -1);
    if (effectIndex.length > 0) {
      effectIndex = effectIndex[0];
      effect = effect.substring(0, effectIndex);
    } else {
      effect = effect.trim();
    }

    info.push({
      name: gemName,
      isImputed: isImputed,
      level: level,
      effect: effect,
      tier: tier,
    });
  }

  info.sort(function (a, b) {
    if (a.level > b.level) return -1;
    else if (a.level < b.level) return 1;

    if (a.name > b.name) return 1;
    else if (a.name < b.name) return -1;

    if (a.effect > b.effect) return 1;
    else if (a.effect < b.effect) return -1;

    return 0;
  });

  for (let i of info) {
    result.push(`[${i.name}] Lv.${i.level}${i.level < 10 ? '  ' : ' '}${i.effect}`);
  }

  return result.join('\n');
}

async function abilityStone(args) {
  let name = args[0];
  let api_result = await parseCharacterInfo(name);
  if (api_result.status !== 200) {
    return api_result.comment;
  }

  if (!api_result.data) {
    return `${name}을 찾을 수 없습니다.`;
  }

  let rows = await cUtils.selectAbilityStone(api_result.characterId);

  if (rows.length === 0) {
    return `${name}은 장착중인 스톤이 없는 것 같습니다.`;
  }

  let result = [`${name}의 어빌리티 스톤`];
  for (let r of rows) {
    result.push(`${r.activity_name} Lv.${r.activity_value}`);
  }

  return result.join('\n');
}

async function engravings(args) {
  let name = args[0];
  let api_result = await parseCharacterInfo(name);
  if (api_result.status !== 200) {
    return api_result.comment;
  }

  if (!api_result.data) {
    return `${name}을 찾을 수 없습니다.`;
  }

  let rows = await cUtils.selectEngraving(api_result.characterId);

  if (rows.length === 0) {
    return `${name}은 장착중인 각인이 없는 것 같습니다.`;
  }

  let result = [`${name}의 각인`];
  for (let row of rows) {
    result.push(` [${row.name}] Lv.${row.level}`);
  }

  return result.join('\n');
}

async function collectibles(args) {
  let name = args[0];
  let api_result = await parseCharacterInfo(name);
  if (api_result.status !== 200) {
    return api_result.comment;
  }

  if (!api_result.data) {
    return `${name}을 찾을 수 없습니다.`;
  }

  let rows = await cUtils.selectCollectibles(api_result.characterId);

  if (rows.length === 0) {
    return `${name}은 수집 포인트가 없는 것 같습니다.`;
  }

  let result = [`${name}의 수집 포인트`];
  let totalPercent = 0.0;
  let totalPoint = 0;
  for (let row of rows) {
    result.push(` [${row.type}] ${row.point} (${row.percent.toFixed(1)}%)`);
    totalPercent += row.percent;
    totalPoint += row.point;
  }
  totalPercent /= rows.length;
  result.push(` [전체 진행도] ${totalPoint} (${totalPercent.toFixed(1)}%)`);
  return result.join('\n');
}

async function avatar_equips(args) {
  const name = args[0];
  const api_result = await api.armories_character(name, api.armories_types.avatars);

  if (api_result.status !== 200) {
    return api_result.comment;
  }

  if (!api_result.data || api_result.data.length === 0) {
    return `${name}의 아바타를 불러올 수 없습니다.`;
  }

  let info = {};
  for (let a of api_result.data) {
    let type = a.Type.split(' ')[0].substring(0, 2);
    if (!type) type = '이동';
    let name = a.Name;
    let isInner = a.IsInner;
    if (!info[isInner]) {
      info[isInner] = [];
    }

    info[isInner].splice(0, 0, {
      type: type,
      name: name,
      isInner: isInner,
    });
  }

  let result = [`<${name}의 착용중인 아바타>\n`];
  if (info[false]) {
    result.push(`[Outer]`);
  }

  for (let a of info[false]) {
    result.push(` [${a.type}] ${a.name}`);
  }

  if (info[true]) {
    result.push(`\n[Inner]`);
  }
  for (let a of info[true]) {
    result.push(` [${a.type}] ${a.name}`);
  }
  return result.join('\n');
}

// async function test() {
//   global.env = require("../../../libs/env");
//   global.mysql = await require("../../Mysql/MysqlService").create();
//   // let result = await equipments(["아트네"]);
//   await cUtils.deleteOldContents();
//   // console.log(result);
// }

// test().then();

module.exports = {
  profile,
  equipments,
  avatar_url,
  skills,
  gems,
  abilityStone,
  engravings,
  collectibles,
  avatar_equips,
};
