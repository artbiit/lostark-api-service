const logger = require('../../../libs/logger');
const utils = require('../../../libs/utils');

/** 길드가 DB에 등록되어있는지 확인 하고 id를 반환합니다. */
async function checkGuild(guildName) {
  if (!guildName) {
    return 0;
  }
  let select = 'SELECT seq_no FROM guild WHERE `name` = ?;';
  const [rows] = await mysql.query(select, [guildName]);
  if (rows.length === 0) {
    let insert = 'INSERT INTO guild (`name`) VALUES (?);';
    const [result] = await mysql.execute(insert, [guildName]);
    return result.insertId;
  }
  return rows[0].seq_no;
}

/** armories profile에 해당하는 정보를 갱신합니다. 캐릭터 id를 반환합니다. */
/** armories profile에 해당하는 정보를 갱신합니다. 캐릭터 id를 반환합니다. */
/** armories profile에 해당하는 정보를 갱신합니다. 캐릭터 id를 반환합니다. */
async function upsertCharacter(name, profile, arkPassive, guildId, now) {
  if (!profile) return;

  if (!profile.TownName) {
    profile.TownName = null;
  }

  // 기본값 설정
  let arkPassiveEvolution = 0;
  let arkPassiveRealization = 0;
  let arkPassiveLeap = 0;

  // profile에서 Points 배열을 찾아 값 가져오기
  if (arkPassive && Array.isArray(arkPassive.Points)) {
    for (const point of arkPassive.Points) {
      if (point.Name === '진화') {
        arkPassiveEvolution = point.Value ?? 0;
      } else if (point.Name === '깨달음') {
        arkPassiveRealization = point.Value ?? 0;
      } else if (point.Name === '도약') {
        arkPassiveLeap = point.Value ?? 0;
      }
    }
  }

  const realizationMatch = arkPassive.Effects[0].Description.match(/>([^<]+)\sLv\./);
  let realization_name = realizationMatch ? realizationMatch[1] : null;

  let upsertQuery = `
    INSERT INTO \`character\` 
      (\`name\`, title, class_name, char_level, expedition_level, pvp_grade_name, 
      using_skill_point, total_skill_point, item_avg_level, item_max_level, \`server\`, guild_id, 
      guild_grade, town_name, image_url, last_update, ark_passive_evolution, 
      ark_passive_realization, ark_passive_leap, realization_name) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      title = VALUES(title), 
      class_name = VALUES(class_name), 
      char_level = VALUES(char_level), 
      expedition_level = VALUES(expedition_level), 
      pvp_grade_name = VALUES(pvp_grade_name), 
      using_skill_point = VALUES(using_skill_point), 
      total_skill_point = VALUES(total_skill_point), 
      item_avg_level = VALUES(item_avg_level), 
      item_max_level = VALUES(item_max_level), 
      \`server\` = VALUES(\`server\`), 
      guild_id = VALUES(guild_id), 
      guild_grade = VALUES(guild_grade), 
      town_name = VALUES(town_name), 
      image_url = VALUES(image_url), 
      last_update = VALUES(last_update), 
      ark_passive_evolution = VALUES(ark_passive_evolution), 
      ark_passive_realization = VALUES(ark_passive_realization), 
      ark_passive_leap = VALUES(ark_passive_leap),
      seq_no = LAST_INSERT_ID(seq_no),
      realization_name = VALUES(realization_name);
  `;

  let [result] = await mysql.execute(upsertQuery, [
    name,
    profile.Title,
    profile.CharacterClassName,
    profile.CharacterLevel,
    profile.ExpeditionLevel,
    profile.PvpGradeName,
    profile.UsingSkillPoint,
    profile.TotalSkillPoint,
    profile.ItemAvgLevel,
    profile.ItemMaxLevel,
    profile.ServerName,
    guildId,
    profile.GuildMemberGrade,
    profile.TownName,
    profile.CharacterImage,
    now,
    arkPassiveEvolution,
    arkPassiveRealization,
    arkPassiveLeap,
    realization_name,
  ]);

  // 마지막으로 삽입/업데이트된 ID 반환
  return result.insertId;
}

/** DB 에서 캐릭터 정보를 가져옵니다. */
async function selectCharacter(name) {
  const sql =
    'SELECT c.*, g.name as guild_name FROM `character` c LEFT JOIN guild g ON c.guild_id = g.seq_no WHERE c.name = ?;';
  const [rows] = await mysql.query(sql, [name]);
  return rows[0];
}

async function selectTypeValue(characterId, table) {
  const sql = `SELECT type, value FROM ${table} WHERE character_id = ? ORDER BY value DESC;`;
  const [rows] = await mysql.query(sql, [characterId]);
  return rows;
}

async function upsertTypeValue(characterId, set, table) {
  if (!set) {
    return 0;
  }
  const insert = `INSERT INTO ${table} (character_id, \`type\`, \`value\`) VALUES (?,?,?);`;
  const update = `UPDATE ${table} SET \`value\` = ? WHERE character_id = ? AND \`type\` = ?;`;
  let affectedRows = 0;
  for (let s of set) {
    const value = Number(s.Value || s.Point);
    let [result] = await mysql.execute(update, [value, characterId, s.Type]);
    let affected = result.affectedRows;
    if (!affected) {
      [result] = await mysql.execute(insert, [characterId, s.Type, value]);
      affectedRows++;
    }
    {
      affectedRows += affected;
    }
  }
}

async function selectStats(characterId) {
  return await selectTypeValue(characterId, 'stats');
}

async function upsertStats(characterId, stats) {
  return await upsertTypeValue(characterId, stats, 'stats');
}

async function upsertTendencies(characterId, tendencies) {
  return await upsertTypeValue(characterId, tendencies, 'tendencies');
}

async function selectTendencies(characterId) {
  return await selectTypeValue(characterId, 'tendencies');
}

/** 이미 기입된 엘릭서 효과가 있는지 찾아봅니다. 없다면 기입 후 seq_no값을 반환합니다 */
async function checkElixir(elixir) {
  if (!elixir || elixir.level == 0) {
    return 0;
  }
  const select = 'SELECT seq_no FROM elixir WHERE name = ? AND slot_type = ?;';
  const [rows] = await mysql.query(select, [elixir.name, elixir.slot_type]);
  if (rows.length === 0) {
    let insert = 'INSERT INTO elixir(name, slot_type) VALUES (?,?);';
    const [result] = await mysql.execute(insert, [elixir.name, elixir.slot_type]);
    return result.insertId;
  }
  return rows[0].seq_no;
}
const equipTypes = {
  무기: '무기',
  투구: '투구',
  상의: '상의',
  하의: '하의',
  어깨: '어깨',
  장갑: '장갑',
};

function parseEvolutionLevel(element, eq) {
  const match = element.value.Element_001.match(/Lv\.(\d+)진화/);
  if (match) {
    eq.evolution_level = parseInt(match[1], 10);
  }
}

function parseItemTitle(element, eq) {
  if (element.value.hasOwnProperty('qualityValue')) {
    eq.quality = element.value.qualityValue;
  }
  if (element.value.hasOwnProperty('leftStr2')) {
    const match = element.value.leftStr2.match(/아이템 레벨 (\d+)/);
    if (match) {
      eq.item_level = parseInt(match[1], 10);
    }
  }
  if (element.value.hasOwnProperty('leftStr0')) {
    eq.item_grade = element.value.leftStr0.replace(/<.*?>/g, ''); // HTML 태그 제거
  }
}

async function upsertEquipments(characterId, equipments) {
  const update = `
    UPDATE equipment 
    SET name = ?, upgrade_level = ?, evolution_level = ?, item_level = ?, quality = ?, item_grade = ?, 
        transcendence_level = ?, transcendence_count = ?, elixir_0 = ?, elixir_0_level = ?, 
        elixir_1 = ?, elixir_1_level = ?, advanced_reforge = ? 
    WHERE character_id = ? AND slot_type = ?;`;

  const insert = `
    INSERT INTO equipment (character_id, slot_type, name, upgrade_level, evolution_level, item_level, quality, 
                           item_grade, transcendence_level, transcendence_count, elixir_0, elixir_0_level, 
                           elixir_1, elixir_1_level, advanced_reforge) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;

  for (let e of equipments) {
    if (!equipTypes[e.Type]) {
      continue;
    }

    const eq = {
      slot_type: e.Type,
      name: e.Name,
      upgrade_level: 0,
      evolution_level: 0,
      item_level: 0,
      quality: 0,
      item_grade: '',
      transcendence_level: 0,
      transcendence_count: 0,
      elixir: [
        { id: 0, level: 0 },
        { id: 0, level: 0 },
      ], // 기본값 설정
      advanced_reforge: 0,
    };

    // 강화 레벨과 이름 분리
    let tmp = e.Name.split(' ');
    if (tmp && tmp.length) {
      eq.upgrade_level = Number(tmp.shift()) || 0;
      eq.name = tmp.join(' ');
    }

    const tooltip = JSON.parse(utils.removeHtmlTag(e.Tooltip));
    for (let key in tooltip) {
      const element = tooltip[key];

      if (element.hasOwnProperty('type')) {
        switch (element.type) {
          case 'ItemTitle':
            parseItemTitle(element, eq);
            break;
          case 'IndentStringGroup':
            if (!element.value) continue;
            const value = element.value['Element_000'];
            if (!value || !value.topStr) continue;
            if (value.topStr.includes('초월')) {
              parseTranscendence(value, eq);
            } else if (value.topStr.includes('엘릭서')) {
              parseElixir(value, eq); // ⬅️ 엘릭서 정보 추출 추가
            }
            break;
          case 'SingleTextBox':
            if (element.value.indexOf('상급 재련') > 0) {
              parseAdvancedReforge(element, eq);
            }
            break;
          case 'ItemPartBox':
            if (element.value.Element_000.includes('장비 업그레이드 효과')) {
              parseEvolutionLevel(element, eq);
            }
            break;
        }
      }
    }

    // 🛠 엘릭서 정보 처리 (무기는 제외)
    for (let i = 0; i < 2; i++) {
      let seq_no = await checkElixir(eq.elixir[i]);
      eq.elixir[i].id = seq_no || 0;
    }

    let [result] = await mysql.execute(update, [
      eq.name,
      eq.upgrade_level,
      eq.evolution_level, // 추가된 필드
      eq.item_level,
      eq.quality,
      eq.item_grade,
      eq.transcendence_level,
      eq.transcendence_count,
      eq.elixir[0].id,
      eq.elixir[0].level,
      eq.elixir[1].id,
      eq.elixir[1].level,
      eq.advanced_reforge,
      characterId,
      eq.slot_type,
    ]);

    if (!result.affectedRows) {
      await mysql.execute(insert, [
        characterId,
        eq.slot_type,
        eq.name,
        eq.upgrade_level,
        eq.evolution_level, // 추가된 필드
        eq.item_level,
        eq.quality,
        eq.item_grade,
        eq.transcendence_level,
        eq.transcendence_count,
        eq.elixir[0].id,
        eq.elixir[0].level,
        eq.elixir[1].id,
        eq.elixir[1].level,
        eq.advanced_reforge,
      ]);
    }
  }
}

async function upsertAbilityStone(characterId, equipments) {
  for (let e of equipments) {
    if (e.Type !== '어빌리티 스톤') {
      continue;
    }

    let tooltip = JSON.parse(utils.removeHtmlTag(e.Tooltip));

    for (let key of Object.keys(tooltip)) {
      let t = tooltip[key];
      if (t.type !== 'IndentStringGroup') {
        continue;
      }
      if (!t.value) continue;
      let data = t.value.Element_000.contentStr;
      await mysql.execute('DELETE FROM abilityStone WHERE character_id = ?;', [characterId]);

      for (let k of Object.keys(data)) {
        let d = data[k];
        let name = d.contentStr.substring(1, d.contentStr.indexOf(']'));
        let value = Number(d.contentStr.substring(d.contentStr.indexOf('+')));
        let type = name.indexOf('감소') !== -1;
        await mysql.execute(
          'INSERT INTO abilityStone(character_id, activity_name, activity_value, activity_type) VALUES (?,?,?,?)',
          [characterId, name, value, type],
        );
      }
    }
  }
}

async function selectAbilityStone(characterId) {
  let [rows] = await mysql.query(
    'SELECT activity_name, activity_value, activity_type FROM abilityStone WHERE character_id = ? ORDER BY activity_value DESC;',
    [characterId],
  );
  return rows;
}
function parseItemTitle(info, eq) {
  const value = info.value;
  const slotData = value.slotData;
  eq.quality = value.qualityValue || 0;
  eq.item_grade = slotData.iconGrade || 0;
  let leftStr2 = value.leftStr2.replace('아이템 레벨 ', '');
  leftStr2 = leftStr2.split(' ')[0];
  eq.item_level = Number(leftStr2) || 0;
}

function parseTranscendence(info, eq) {
  let tmp = info.topStr.split(' ');
  eq.transcendence_level = Number(tmp[2].replace('단계', '')) || 0;
  eq.transcendence_count = Number(tmp[3]) || 0;
}

function parseElixir(info, eq) {
  let elixir = eq.elixir;
  let value = info.contentStr;

  let i = 0;
  for (let key in value) {
    const v = value[key];
    if (!v) continue; // 값이 없으면 건너뜀

    let str = v.contentStr;

    // **type 추출** - "[공용]" 또는 "[투구]" 형태
    let typeMatch = str.match(/\[(.*?)\]/);
    let type = typeMatch ? typeMatch[1] : 'Unknown';

    // **level 추출** - "Lv." 뒤의 숫자
    let levelMatch = str.match(/Lv\.(\d+)/);
    let level = levelMatch ? Number(levelMatch[1]) : 0;

    // **name 추출** - "[부위] " 다음부터 "Lv." 앞까지
    let nameStartIndex = str.indexOf('] ') + 2; // "] " 이후
    let nameEndIndex = str.indexOf(' Lv.'); // " Lv." 앞까지
    let name = nameEndIndex !== -1 ? str.substring(nameStartIndex, nameEndIndex).trim() : 'Unknown';

    const result = {
      slot_type: type, // 부위 (공용, 투구 등)
      name: name, // 엘릭서 이름
      level: level, // 레벨
      id: elixir.id || 0,
    };
    elixir[i++] = result;
  }
}

function parseAdvancedReforge(info, eq) {
  const match = info.value.match(/(?<=\[상급 재련\] )\d+/);
  eq.advanced_reforge = match ? Number(match[0]) : null; // 숫자로 변환
}

async function selectTotalElixirLevel(characterId) {
  const [rows] = await mysql.query(
    'SELECT IFNULL( SUM(elixir_0_level + elixir_1_level), 0) as total_level FROM equipment WHERE character_id = ?;',
    [characterId],
  );
  return rows[0].total_level;
}

async function selectTotalTranscendenceCount(characterId) {
  const [rows] = await mysql.query(
    'SELECT IFNULL(SUM(transcendence_count), 0) as total_count FROM equipment WHERE character_id = ?;',
    [characterId],
  );
  return rows[0].total_count;
}

const itemGrade = {
  0: '일반',
  1: '고급',
  2: '희귀',
  3: '영웅',
  4: '전설',
  5: '유물',
  6: '고대',
};

function itemGradeToName(grade) {
  let name = itemGrade[grade];
  if (!name) {
    name = '모름';
  }
  return name;
}

function itemGradeToNum(grade) {
  let result = Object.keys(itemGrade).find((key) => itemGrade[key] === grade);
  if (result === undefined) {
    result = -1;
  }
  return result;
}

function isNeedParse(character, now = new Date()) {
  let needParse = !character;
  if (!needParse) {
    const last_update = new Date(character.last_update);
    needParse = now.getTime() - last_update.getTime() >= 600 * 1000; //10분 이상 지났으면 새로 갱신해올 것
  }
  return needParse;
}

async function selectEquipments(characterId) {
  const [rows] = await mysql.query(
    'SELECT slot_type, upgrade_level, item_level, quality, item_grade, evolution_level, transcendence_level, transcendence_count, elixir_0, elixir_1, elixir_0_level, elixir_1_level, advanced_reforge FROM equipment WHERE character_id = ?;',
    [characterId],
  );
  return rows;
}
async function selectTotalAdvancedReforge(characterId) {
  const [rows] = await mysql.query(
    'SELECT Sum(advanced_reforge) as total FROM equipment WHERE character_id = ?;',
    [characterId],
  );
  return rows[0].total || 0;
}

async function selectElixir(characterId) {
  let result = {};
  for (let i = 0; i < 2; i++) {
    const sql = `SELECT el.name, el.slot_type as el_slot, eq.slot_type as eq_slot, eq.elixir_${i}_level as level FROM elixir el LEFT JOIN equipment eq ON el.seq_no = eq.elixir_${i} WHERE character_id = ?;`;
    const [rows] = await mysql.query(sql, [characterId]);
    for (let row of rows) {
      if (!result[row.eq_slot]) {
        result[row.eq_slot] = [];
      }

      result[row.eq_slot].push({
        name: row.name,
        type: row.el_slot,
        level: row.level,
      });
    }
  }
  return result;
}

async function selectAvatarLink(characterName) {
  const select = 'SELECT image_url FROM `character` WHERE `name` = ?;';
  let [rows] = await mysql.query(select, [characterName]);
  return rows[0];
}

async function checkRandomCard(kakaoName, index) {
  const select = 'SELECT `index` FROM dailyRandomCard WHERE name = ?;';
  let [rows] = await mysql.query(select, [kakaoName]);

  if (rows.length !== 0) {
    return rows[0].index;
  }

  await mysql.execute('INSERT INTO dailyRandomCard(name, `index`) VALUES (?, ?);', [
    kakaoName,
    index,
  ]);
  return index;
}

async function checkReforgeGame(kakaoName) {
  const select = 'SELECT `level`, probability, last_reforge FROM reforgeGame WHERE `name` = ?;';
  let [rows] = await mysql.query(select, [kakaoName]);

  let last;
  let level = 0;
  let probability = 1.0;
  if (rows.length === 0) {
    last = new Date();
    last.setTime(last.getTime() - 60 * 60 * 1000);
    await mysql.execute(
      'INSERT INTO reforgeGame(`name`, `level`, probability, last_reforge) VALUES (?, ?, ?, ?);',
      [kakaoName, level, probability, last],
    );
  } else {
    last = new Date(rows[0].last_reforge);
    level = rows[0].level;
    probability = rows[0].probability;
  }

  let data = {
    last_reforge: last,
    level: level,
    probability: probability,
  };

  return data;
}

async function updateReforgeGame(kakaoName, data) {
  const update =
    'UPDATE reforgeGame SET `level` = ?, probability = ?, last_reforge = ? WHERE `name` = ?';
  await mysql.execute(update, [data.level, data.probability, data.last_reforge, kakaoName]);
}

async function upsertEngraving(characterId, data) {
  // 기존 캐릭터의 각인 데이터를 삭제
  const remove = 'DELETE FROM engraving WHERE character_id = ?;';
  await mysql.execute(remove, [characterId]);

  // ArkPassiveEffects 데이터 저장
  if (data.ArkPassiveEffects) {
    for (let effect of data.ArkPassiveEffects) {
      let name = effect.Name;
      let level = effect.Level || 0; // 0이면 기본값 처리
      let grade = effect.Grade || '알 수 없음'; // 등급이 없을 경우 기본값

      await mysql.execute(
        'INSERT INTO engraving(character_id, name, level, grade) VALUES (?,?,?,?) ' +
          'ON DUPLICATE KEY UPDATE level = VALUES(level), grade = VALUES(grade);',
        [characterId, name, level, grade],
      );
    }
  }
}

async function selectEngraving(characterId) {
  const select = 'SELECT name, level, grade FROM engraving WHERE character_id = ?;';
  const [rows] = await mysql.query(select, [characterId]);
  return rows;
}

async function upsertCollectibles(characterId, data) {
  const update =
    'UPDATE collectibles SET point = ?, percent = ? WHERE character_id = ? AND type = ?;';
  const insert = 'INSERT INTO collectibles (character_id, type, point, percent) VALUES(?,?,?,?);';

  for (let c of data) {
    const point = c.Point;
    const percent = (c.Point / c.MaxPoint) * 100.0;

    let [result] = await mysql.execute(update, [point, percent, characterId, c.Type]);
    let affected = result.affectedRows;
    if (!affected) {
      [result] = await mysql.execute(insert, [characterId, c.Type, point, percent]);
    }
  }
}

async function selectCollectibles(characterId) {
  const select = 'SELECT type, point, percent FROM collectibles WHERE character_id = ?;';
  let [rows] = await mysql.query(select, [characterId]);
  return rows;
}
async function upsertProcyon(data) {
  for (const item of data) {
    if (!item.StartTimes) {
      continue;
    }

    const [categoryResult] = await mysql.execute(
      `INSERT INTO Categories (CategoryName) VALUES (?)
       ON DUPLICATE KEY UPDATE CategoryID=LAST_INSERT_ID(CategoryID), CategoryName=VALUES(CategoryName)`,
      [item.CategoryName ?? null],
    );

    const categoryId = categoryResult.insertId;

    const [contentResult] = await mysql.execute(
      `INSERT INTO Contents (CategoryID, ContentsName, ContentsIcon, MinItemLevel, Location)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       ContentID=LAST_INSERT_ID(ContentID),
       CategoryID=VALUES(CategoryID),
       ContentsName=VALUES(ContentsName),
       ContentsIcon=VALUES(ContentsIcon),
       MinItemLevel=VALUES(MinItemLevel),
       Location=VALUES(Location)`,
      [
        categoryId,
        item.ContentsName ?? null,
        item.ContentsIcon ?? null,
        item.MinItemLevel ?? null,
        item.Location ?? null,
      ],
    );

    const contentId = contentResult.insertId;

    for (const startTime of item.StartTimes) {
      await mysql.execute(
        `INSERT INTO ContentStartTimes (ContentID, StartTime)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE
         StartTime=VALUES(StartTime)`,
        [contentId, new Date(startTime)],
      );
    }

    if (Array.isArray(item.RewardItems)) {
      for (const rewardItem of item.RewardItems) {
        if (!rewardItem.Items) {
          continue;
        }

        for (const reward of rewardItem.Items) {
          const [rewardResult] = await mysql.execute(
            `INSERT INTO RewardItems (ContentID, Name, Icon, Grade)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             RewardItemID=LAST_INSERT_ID(RewardItemID),
             ContentID=VALUES(ContentID),
             Name=VALUES(Name),
             Icon=VALUES(Icon),
             Grade=VALUES(Grade)`,
            [contentId, reward.Name, reward.Icon ?? null, reward.Grade ?? null],
          );

          const rewardItemId = rewardResult.insertId;

          if (Array.isArray(reward.StartTimes)) {
            for (const rewardStartTime of reward.StartTimes) {
              if (!rewardStartTime) {
                continue;
              }

              await mysql.execute(
                `INSERT INTO RewardStartTimes (RewardItemID, StartTime)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE
                 StartTime=VALUES(StartTime)`,
                [rewardItemId, new Date(rewardStartTime)],
              );
            }
          }
        }
      }
    }
  }
}

async function selectTodaysRemainingContents() {
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const [contents] = await mysql.query(
    `SELECT c.CategoryName, cnt.ContentID, cnt.ContentsName, cnt.ContentsIcon, cnt.MinItemLevel, cnt.Location,
                    cst.StartTime AS ContentStartTime, ri.RewardItemID, ri.Name AS RewardName, ri.Icon AS RewardIcon, ri.Grade,
                    rst.StartTime AS RewardStartTime
             FROM Contents cnt
             JOIN Categories c ON c.CategoryID = cnt.CategoryID
             LEFT JOIN ContentStartTimes cst ON cnt.ContentID = cst.ContentID AND cst.StartTime BETWEEN ? AND ?
             LEFT JOIN RewardItems ri ON cnt.ContentID = ri.ContentID
             LEFT JOIN RewardStartTimes rst ON ri.RewardItemID = rst.RewardItemID AND rst.StartTime BETWEEN ? AND ?
             WHERE cst.StartTime IS NOT NULL OR rst.StartTime IS NOT NULL
             ORDER BY cst.StartTime, rst.StartTime`,
    [now, endOfDay, now, endOfDay],
  );
  2;
  const result = [];

  for (const row of contents) {
    let content = result.find((c) => c.ContentsName === row.ContentsName);

    if (!content) {
      content = {
        CategoryName: row.CategoryName,
        ContentsName: row.ContentsName,
        ContentsIcon: row.ContentsIcon,
        MinItemLevel: row.MinItemLevel,
        StartTimes: [],
        Location: row.Location,
        RewardItems: [],
      };
      result.push(content);
    }

    if (row.ContentStartTime) {
      content.StartTimes.push(row.ContentStartTime);
    }

    if (row.RewardItemID) {
      let rewardItem = content.RewardItems.find((ri) => ri.Name === row.RewardName);

      if (!rewardItem) {
        rewardItem = {
          Name: row.RewardName,
          Icon: row.RewardIcon,
          Grade: row.Grade,
          StartTimes: [],
        };
        content.RewardItems.push(rewardItem);
      }

      if (row.RewardStartTime) {
        rewardItem.StartTimes.push(row.RewardStartTime);
      }
    }
  }

  return result;
}

async function deleteOldContents() {
  try {
    logger.info('Deleting old content start times...');
    let [deletedContentTimes] = await mysql.execute(
      `DELETE FROM ContentStartTimes WHERE StartTime < NOW()`,
    );
    logger.info(`Deleted ${deletedContentTimes.affectedRows} rows from ContentStartTimes`);

    logger.info('Deleting old reward start times...');
    let [deletedRewardTimes] = await mysql.execute(
      `DELETE FROM RewardStartTimes WHERE StartTime < NOW()`,
    );
    logger.info(`Deleted ${deletedRewardTimes.affectedRows} rows from RewardStartTimes`);

    logger.info('Deleting orphaned reward items...');
    let [deletedRewardItems] = await mysql.execute(`
      DELETE FROM RewardItems WHERE ContentID NOT IN (SELECT ContentID FROM ContentStartTimes)
    `);
    logger.info(`Deleted ${deletedRewardItems.affectedRows} rows from RewardItems`);

    logger.info('Deleting orphaned contents...');
    let [deletedContents] = await mysql.execute(`
      DELETE FROM Contents WHERE ContentID NOT IN (SELECT ContentID FROM ContentStartTimes)
    `);
    logger.info(`Deleted ${deletedContents.affectedRows} rows from Contents`);

    logger.info('Old content cleanup completed successfully.');
  } catch (error) {
    logger.info('Error during cleanup:', error);
  }
}

module.exports = {
  checkGuild,
  upsertCharacter,
  selectCharacter,
  selectStats,
  upsertStats,
  selectTendencies,
  upsertTendencies,
  upsertEquipments,
  selectTotalElixirLevel,
  selectTotalTranscendenceCount,
  itemGrade,
  itemGradeToName,
  isNeedParse,
  selectEquipments,
  selectTotalAdvancedReforge,
  selectElixir,
  selectAvatarLink,
  checkRandomCard,
  checkReforgeGame,
  updateReforgeGame,
  upsertAbilityStone,
  selectAbilityStone,
  upsertEngraving,
  selectEngraving,
  upsertCollectibles,
  selectCollectibles,
  upsertProcyon,
  selectTodaysRemainingContents,
  deleteOldContents,
};
