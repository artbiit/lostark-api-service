/**
 * armories 그룹 명령(정보/장비/스킬/보석/각인/돌/수집/착장/아바타/카드/전장)의
 * 카카오톡 텍스트 포맷 함수 모음.
 *
 * legacy/src/Service/Commands/armories.js 의 텍스트 컨벤션을 의미적으로 모방한다.
 * 단, 데이터 소스는 ArmoriesService.getCharacterDetailPartial 의 normalized 응답.
 */

import {
  elapsedTime,
  EMOJI,
  joinLines,
  padItemLevel,
  padQuality,
  padTwoDigit,
  sectionHeader,
} from './kakao.js';

// 응답 타입은 NormalizedCharacterDetail 의 Partial 이라 any-ish. 안전하게 narrow.
type AnyDetail = Record<string, any>;

// === 정보 ===

export function formatProfile(name: string, detail: AnyDetail): string {
  const profile = detail.profile ?? {};
  const engravings: any[] = Array.isArray(detail.engravings) ? detail.engravings : [];
  const ark = detail.arkPassive ?? null;

  const lines: string[] = [];

  // 1. [칭호] 이름
  const title = detail.title;
  lines.push(title ? `${title} ${name}` : name);

  // 2. realization + 직업명 (realization 없으면 직업명만)
  const className = detail.className ?? '';
  const realizationName: string | null = ark?.realizationName ?? null;
  if (realizationName && className) {
    lines.push(`${realizationName} ${className}`);
  } else if (className) {
    lines.push(className);
  }

  // 3. 각인 3줄: 이름 첫글자 / 등급 첫글자 / 레벨
  if (engravings.length > 0) {
    const row1 = engravings.map((e: any) => (e.name?.[0] ?? '?')).join(' ');
    const row2 = engravings.map((e: any) => (e.grade?.[0] ?? '?')).join(' ');
    const row3 = engravings.map((e: any) => (e.level ?? '?')).join(' ');
    lines.push('');
    lines.push(row1);
    lines.push(row2);
    lines.push(row3);
  }

  // 4. 돌 오우너 라인 (positive 합계 ≥ 16 + positive.length ≥ 2)
  const stoneSummary = summarizeStoneActivity(Array.isArray(detail.equipment) ? detail.equipment : []);
  if (stoneSummary && stoneSummary.total >= 16 && stoneSummary.positive.length >= 2) {
    const a = stoneSummary.positive[0];
    const b = stoneSummary.positive[1];
    lines.push(`"${a}${b}돌 오우너"`);
  }

  // 5. (빈 줄)
  lines.push('');

  // 6. 템/전 — itemLevel / combatPower
  const itemLevel = detail.itemLevel ?? 0;
  const combatPower = detail.combatPower ?? 0;
  lines.push(`템/전\t${itemLevel}/${combatPower}`);
  // 6-1. 원정대 (별행)
  lines.push(`원정대\t${detail.expeditionLevel ?? 0}`);

  // 7. 서버/길드 + 길드 등급
  const serverLabel = detail.serverName || '알 수 없음';
  if (detail.guildName) {
    const grade = detail.guildMemberGrade ? `의 ${detail.guildMemberGrade}` : '';
    lines.push(`서버/길드\t${serverLabel}/${detail.guildName}${grade}`);
  } else {
    lines.push(`서버/길드\t${serverLabel}/없음`);
  }

  const stats: any[] = profile.stats ?? [];
  // 8. 전투특성
  if (stats.length >= 4) {
    const combat = stats.filter((s: any) => /치명|특화|제압|신속|인내|숙련/.test(s.type));
    combat.sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0));
    const top2 = combat.slice(0, 2);
    if (top2.length === 2) {
      lines.push(`전투특성\t${top2[0].type[0]}:${top2[0].value} ${top2[1].type[0]}:${top2[1].value}`);
    }
  }

  // 9. 스킬포인트
  if (profile.skillPoints) {
    lines.push(`스킬포인트\t${profile.skillPoints.used}/${profile.skillPoints.total}`);
  }

  // 10. pvp
  if (profile.pvpGrade) {
    lines.push(`pvp\t${profile.pvpGrade}`);
  }

  // 11. 공격력/체력
  const attack = stats.find?.((s: any) => s.type === '공격력');
  const hp = stats.find?.((s: any) => s.type === '최대 생명력');
  if (attack && hp) {
    lines.push(`공격력/체력\t${attack.value}/${hp.value}`);
  }

  // 12. 엘/초/상 (equipment 가 partial 응답에 포함됐을 때만 의미 있음)
  const equipment = Array.isArray(detail.equipment) ? detail.equipment : [];
  if (equipment.length > 0) {
    const eq = summarizeEquipmentForProfile(equipment);
    lines.push(
      `엘/초/상\t${eq.elixirTotal}/${eq.transcendenceTotal}/${eq.advancedReforgeTotal}`,
    );
  }

  // 13. 진/깨/도 (ArkPassive 활성 시)
  if (ark) {
    lines.push(`진/깨/도\t${ark.points.evolution}/${ark.points.realization}/${ark.points.leap}`);
  }

  // 14. 성향
  const tendencies: any[] = profile.tendencies ?? [];
  for (let i = 0; i + 1 < tendencies.length; i += 2) {
    const t1 = tendencies[i];
    const t2 = tendencies[i + 1];
    lines.push(`${t1.type}/${t2.type}\t${t1.point}/${t2.point}`);
  }

  // 15-16. 갱신 시간
  const updatedAt = detail.metadata?.normalizedAt;
  if (updatedAt) {
    lines.push('');
    lines.push('');
    lines.push(`갱신된 시간 ${elapsedTime(updatedAt)}`);
  }

  return joinLines(...lines);
}

/**
 * 어빌리티 스톤 tooltip 의 IndentStringGroup 에서 활성/감소 슬롯의 Lv 를 추출.
 * legacy `commandUtils.js` 의 stones 처리 모방.
 * - `[감소]` 키워드 포함 → negative
 * - 그 외 → positive
 * 반환은 desc 정렬된 value 배열 + positive 합계.
 */
function summarizeStoneActivity(equipment: any[]): {
  positive: number[];
  negative: number[];
  total: number;
} | null {
  const stones = equipment.filter((e: any) => e?.type === '어빌리티 스톤');
  if (stones.length === 0) return null;

  const positive: number[] = [];
  const negative: number[] = [];
  for (const stone of stones) {
    const tooltipRaw = typeof stone.tooltip === 'string' ? stone.tooltip : '';
    if (!tooltipRaw) continue;

    let tooltip: Record<string, any>;
    try {
      tooltip = JSON.parse(removeHtmlTags(tooltipRaw));
    } catch {
      continue;
    }

    for (const key of Object.keys(tooltip)) {
      const el = tooltip[key];
      if (el?.type !== 'IndentStringGroup') continue;
      const inner = el.value?.Element_000?.contentStr;
      if (!inner || typeof inner !== 'object') continue;
      for (const k of Object.keys(inner)) {
        const d = inner[k];
        const c: string = typeof d?.contentStr === 'string' ? d.contentStr : '';
        if (!c) continue;
        const isNegative = c.includes('[감소]');
        const plus = c.indexOf('+');
        if (plus < 0) continue;
        const rest = c.substring(plus + 1).match(/^\d+/);
        const val = rest ? Number(rest[0]) : 0;
        if (!Number.isFinite(val) || val <= 0) continue;
        if (isNegative) negative.push(val);
        else positive.push(val);
      }
    }
  }

  positive.sort((a, b) => b - a);
  negative.sort((a, b) => b - a);
  const total = positive.reduce((s, v) => s + v, 0);
  return { positive, negative, total };
}

/**
 * 6장비(무기/투구/상의/하의/어깨/장갑) 의 엘릭서/초월/상재 합계.
 * formatEquipment 와 동일하게 parseEquipmentTooltip 을 재사용.
 */
function summarizeEquipmentForProfile(equipment: any[]): {
  elixirTotal: number;
  transcendenceTotal: number;
  advancedReforgeTotal: number;
} {
  const slots = new Set(['무기', '투구', '상의', '하의', '어깨', '장갑']);
  let elixirTotal = 0;
  let transcendenceTotal = 0;
  let advancedReforgeTotal = 0;
  for (const eq of equipment) {
    if (!slots.has(eq?.type)) continue;
    const parsed = parseEquipmentTooltip(eq);
    elixirTotal += parsed.elixirs.reduce((s, e) => s + e.level, 0);
    transcendenceTotal += parsed.transcendenceCount;
    advancedReforgeTotal += parsed.advancedReforge;
  }
  return { elixirTotal, transcendenceTotal, advancedReforgeTotal };
}

// === 장비 ===

export function formatEquipment(name: string, detail: AnyDetail): string {
  const equipment: any[] = Array.isArray(detail.equipment) ? detail.equipment : [];
  const equipSlots = new Set(['무기', '투구', '상의', '하의', '어깨', '장갑']);

  const items = equipment.filter((e: any) => equipSlots.has(e.type));
  if (items.length === 0) {
    return `${name}의 장비를 찾을 수 없습니다.`;
  }

  const lines: string[] = [sectionHeader(`${name}의 장비`)];

  let qualitySum = 0;
  let elixirSum = 0;
  let transcendenceSum = 0;
  let advancedReforgeSum = 0;

  const parsed: Array<{
    slot: string;
    upgrade: number;
    quality: number;
    evolution: number;
    itemLevel: number;
    transcendenceLevel: number;
    transcendenceCount: number;
    advancedReforge: number;
    elixirs: Array<{ slot: string; name: string; level: number }>;
  }> = [];

  for (const eq of items) {
    const parsedItem = parseEquipmentTooltip(eq);
    parsed.push(parsedItem);

    let str = `+${parsedItem.upgrade}(${padQuality(parsedItem.quality)}) ${parsedItem.slot}(${parsedItem.evolution}) ${padItemLevel(parsedItem.itemLevel)}`;
    if (parsedItem.transcendenceCount > 0) {
      str += ` ${EMOJI.TRANSCENDENCE}${padTwoDigit(parsedItem.transcendenceCount)}`;
    }
    if (parsedItem.advancedReforge > 0) {
      str += ` ${EMOJI.ADVANCED_REFORGE}${padTwoDigit(parsedItem.advancedReforge)}`;
    }
    lines.push(str);

    qualitySum += parsedItem.quality;
    transcendenceSum += parsedItem.transcendenceCount;
    elixirSum += parsedItem.elixirs.reduce((s, e) => s + e.level, 0);
    advancedReforgeSum += parsedItem.advancedReforge;
  }

  const avgQuality = items.length > 0 ? (qualitySum / items.length).toFixed(2) : '0.00';

  // legacy 와 동일하게 헤더 아래에 요약 라인을 삽입
  lines.splice(
    1,
    0,
    `아이템 레벨 : ${detail.itemLevel ?? 0}`,
    `평균 품질 : ${avgQuality}`,
    `초월${EMOJI.TRANSCENDENCE}합계 : ${transcendenceSum}`,
    `상재${EMOJI.ADVANCED_REFORGE}합계 : ${advancedReforgeSum}`,
    '',
  );

  if (elixirSum > 0) {
    lines.push('');
    lines.push(sectionHeader('엘릭서 정보'));
    for (const item of parsed) {
      if (item.elixirs.length === 0) continue;
      const parts: string[] = [];
      for (const el of item.elixirs) {
        let n = el.name;
        if (n.includes('(')) {
          n = n.split(' ')[0] ?? n;
        } else if (n.length > 5 && n.includes(' ')) {
          const tk = n.split(' ');
          n = `${tk[0]?.[0] ?? ''}${tk[1]?.[0] ?? ''}`;
        }
        parts.push(`${n} Lv.${el.level}`);
      }
      lines.push(`- ${item.slot}) ${parts.join(' ')}`);
    }
    lines.splice(4, 0, `엘릭서 합계 : ${elixirSum}`);
  }

  if (detail.metadata?.normalizedAt) {
    lines.push('');
    lines.push(`갱신된 시간 ${elapsedTime(detail.metadata.normalizedAt)}`);
  }

  return joinLines(...lines);
}

interface ParsedEquipment {
  slot: string;
  upgrade: number;
  quality: number;
  evolution: number;
  itemLevel: number;
  transcendenceLevel: number;
  transcendenceCount: number;
  advancedReforge: number;
  elixirs: Array<{ slot: string; name: string; level: number }>;
}

/**
 * 장비 tooltip(HTML 태그 포함 JSON 문자열) 에서 정량 필드를 뽑는다.
 * legacy commandUtils.js 의 parseEquipments 로직을 TS 로 압축 이식.
 */
function parseEquipmentTooltip(eq: any): ParsedEquipment {
  const result: ParsedEquipment = {
    slot: eq.type ?? '',
    upgrade: 0,
    quality: 0,
    evolution: 0,
    itemLevel: 0,
    transcendenceLevel: 0,
    transcendenceCount: 0,
    advancedReforge: 0,
    elixirs: [],
  };

  // 강화 레벨과 이름 분리
  const nameTokens = String(eq.name ?? '').split(' ');
  const maybeUpgrade = Number(nameTokens[0]);
  if (Number.isFinite(maybeUpgrade)) {
    result.upgrade = maybeUpgrade;
  }

  const tooltipRaw = eq.tooltip;
  if (typeof tooltipRaw !== 'string' || tooltipRaw.length === 0) {
    return result;
  }

  let tooltip: Record<string, any>;
  try {
    tooltip = JSON.parse(removeHtmlTags(tooltipRaw));
  } catch {
    return result;
  }

  for (const key of Object.keys(tooltip)) {
    const element = tooltip[key];
    if (!element?.type) continue;

    switch (element.type) {
      case 'ItemTitle': {
        const value = element.value ?? {};
        if (typeof value.qualityValue === 'number') {
          result.quality = value.qualityValue;
        }
        if (typeof value.leftStr2 === 'string') {
          const m = value.leftStr2.match(/아이템 레벨 (\d+)/);
          if (m) result.itemLevel = parseInt(m[1] ?? '0', 10);
        }
        break;
      }
      case 'IndentStringGroup': {
        const inner = element.value?.Element_000;
        if (!inner?.topStr) continue;
        if (inner.topStr.includes('초월')) {
          const tokens = String(inner.topStr).split(' ');
          const lv = tokens[2] ? Number(String(tokens[2]).replace('단계', '')) : NaN;
          const cnt = tokens[3] ? Number(tokens[3]) : NaN;
          if (Number.isFinite(lv)) result.transcendenceLevel = lv;
          if (Number.isFinite(cnt)) result.transcendenceCount = cnt;
        } else if (inner.topStr.includes('엘릭서')) {
          const content = inner.contentStr;
          if (content && typeof content === 'object') {
            for (const k of Object.keys(content)) {
              const v = content[k];
              if (!v?.contentStr) continue;
              const str: string = v.contentStr;
              const typeMatch = str.match(/\[(.*?)\]/);
              const levelMatch = str.match(/Lv\.(\d+)/);
              const nameStart = str.indexOf('] ') + 2;
              const nameEnd = str.indexOf(' Lv.');
              const elName =
                nameStart > 1 && nameEnd > nameStart ? str.substring(nameStart, nameEnd).trim() : 'Unknown';
              result.elixirs.push({
                slot: typeMatch?.[1] ?? 'Unknown',
                name: elName,
                level: levelMatch ? Number(levelMatch[1]) : 0,
              });
            }
          }
        }
        break;
      }
      case 'SingleTextBox': {
        const v = element.value;
        if (typeof v === 'string' && v.includes('상급 재련')) {
          const m = v.match(/\[상급 재련\]\s*(\d+)/);
          if (m) result.advancedReforge = Number(m[1]);
        }
        break;
      }
      case 'ItemPartBox': {
        const upgrade = element.value?.Element_001;
        if (typeof upgrade === 'string') {
          const m = upgrade.match(/Lv\.(\d+)진화/);
          if (m) result.evolution = parseInt(m[1] ?? '0', 10);
        }
        break;
      }
    }
  }

  return result;
}

function removeHtmlTags(html: string): string {
  return html.replace(/<[^>]*>?/g, '');
}

// === 스킬 ===

export function formatSkills(name: string, detail: AnyDetail): string {
  const skills: any[] = Array.isArray(detail.combatSkills) ? detail.combatSkills : [];
  const filtered = skills.filter((s) => (s.level ?? 0) >= 2);
  if (filtered.length === 0) {
    return `${name}의 스킬 정보를 찾을 수 없습니다.`;
  }

  const lines: string[] = [sectionHeader(`${name}의 스킬`)];
  const tripods: Record<string, Array<{ name: string; level: number; slot: number }>> = {};

  for (const skill of filtered) {
    let txt = `Lv.${skill.level}${skill.level < 10 ? '  ' : ' '}${skill.name}`;
    if (skill.rune) {
      const grade = skill.rune.grade ?? '';
      txt += ` [${grade[0] ?? ''} ${skill.rune.name}]`;
    }
    lines.push(txt);

    for (const t of skill.tripods ?? []) {
      if (!t.isSelected) continue;
      const key = skill.name;
      if (!tripods[key]) tripods[key] = [];
      tripods[key].push({ name: t.name, level: t.level, slot: t.slot });
    }
  }

  const keys = Object.keys(tripods);
  if (keys.length > 0) {
    lines.push('');
    lines.push(sectionHeader('트라이포드 정보'));
    for (const key of keys) {
      const ts = tripods[key] ?? [];
      const slotStr = ts.map((t) => t.slot).join('');
      const lvStr = ts.map((t) => t.level).join('');
      lines.push(`[${key}] ${slotStr}/${lvStr}`);
    }
  }

  return joinLines(...lines);
}

// === 보석 ===

export function formatGems(name: string, detail: AnyDetail): string {
  const gems: any[] = Array.isArray(detail.gems) ? detail.gems : [];
  if (gems.length === 0) {
    return `${name}의 보석을 찾을 수 없습니다.`;
  }

  const lines: string[] = [sectionHeader(`${name}의 보석`)];

  type GemInfo = { name: string; level: number; effect: string };
  const info: GemInfo[] = [];

  for (const g of gems) {
    const tooltipRaw = typeof g.tooltip === 'string' ? g.tooltip : '';
    if (!tooltipRaw) continue;

    let tooltip: Record<string, any>;
    try {
      tooltip = JSON.parse(removeHtmlTags(tooltipRaw));
    } catch {
      continue;
    }

    let gemName = '';
    let level = g.level ?? 0;
    let effect = '';

    for (const k of Object.keys(tooltip)) {
      const el = tooltip[k];
      switch (el?.type) {
        case 'NameTagBox': {
          const v: string = typeof el.value === 'string' ? el.value : '';
          // "10레벨 멸화의 보석" → 이름 후보
          const tk = v.split(' ');
          if (tk.length >= 2) gemName = (tk[1] ?? '').replace('의', '');
          break;
        }
        case 'ItemTitle': {
          const slotData = el.value?.slotData;
          if (slotData?.rtString) {
            const m = String(slotData.rtString).replace('Lv.', '');
            level = Number(m) || level;
          }
          break;
        }
        case 'ItemPartBox': {
          const e1 = el.value?.Element_001;
          if (typeof e1 === 'string') {
            effect = e1;
            const idx = effect.indexOf('] ');
            if (idx >= 0) effect = effect.substring(idx + 2);
            const keywords = ['피해', '재사용', '지원'];
            const positions = keywords.map((kw) => effect.indexOf(kw)).filter((i) => i !== -1);
            if (positions.length > 0) {
              const min = Math.min(...positions);
              effect = effect.substring(0, min);
            }
            effect = effect.trim();
          }
          break;
        }
      }
    }

    info.push({ name: gemName, level, effect });
  }

  info.sort((a, b) => {
    if (a.level !== b.level) return b.level - a.level;
    return a.name.localeCompare(b.name);
  });

  for (const g of info) {
    const pad = g.level < 10 ? '  ' : ' ';
    lines.push(`[${g.name}] Lv.${g.level}${pad}${g.effect}`);
  }

  return joinLines(...lines);
}

// === 각인 ===

export function formatEngravings(name: string, detail: AnyDetail): string {
  const list: any[] = Array.isArray(detail.engravings) ? detail.engravings : [];
  if (list.length === 0) {
    return `${name}은(는) 장착중인 각인이 없는 것 같숨미당.`;
  }

  const lines: string[] = [`${name}의 각인`];
  for (const e of list) {
    // ArkPassive 활성 캐릭은 normalizer 가 level/grade 를 채워준다.
    // 비활성 캐릭은 둘 다 undefined 이므로 이름만 표기 (legacy 동작 유지).
    if (typeof e.level === 'number' && typeof e.grade === 'string' && e.grade.length > 0) {
      lines.push(` [${e.grade}] ${e.name} Lv.${e.level}`);
    } else {
      lines.push(` [${e.name}]`);
    }
  }
  return joinLines(...lines);
}

// === 어빌리티 스톤 ===

export function formatAbilityStone(name: string, detail: AnyDetail): string {
  const equipment: any[] = Array.isArray(detail.equipment) ? detail.equipment : [];
  const stones = equipment.filter((e: any) => e.type === '어빌리티 스톤');
  if (stones.length === 0) {
    return `${name}은(는) 장착중인 스톤이 없는 것 같숨미당.`;
  }

  const lines: string[] = [`${name}의 어빌리티 스톤`];

  for (const stone of stones) {
    const tooltipRaw = typeof stone.tooltip === 'string' ? stone.tooltip : '';
    if (!tooltipRaw) continue;

    let tooltip: Record<string, any>;
    try {
      tooltip = JSON.parse(removeHtmlTags(tooltipRaw));
    } catch {
      continue;
    }

    for (const key of Object.keys(tooltip)) {
      const el = tooltip[key];
      if (el?.type !== 'IndentStringGroup') continue;
      const inner = el.value?.Element_000?.contentStr;
      if (!inner) continue;
      for (const k of Object.keys(inner)) {
        const d = inner[k];
        if (!d?.contentStr) continue;
        const content: string = d.contentStr;
        const nameStart = content.indexOf('[') + 1;
        const nameEnd = content.indexOf(']');
        if (nameStart <= 0 || nameEnd <= nameStart) continue;
        const stoneName = content.substring(nameStart, nameEnd);
        const plus = content.indexOf('+');
        const value = plus >= 0 ? Number(content.substring(plus)) : 0;
        if (Number.isFinite(value)) {
          lines.push(`${stoneName} Lv.${value}`);
        }
      }
    }
  }

  return joinLines(...lines);
}

// === 수집 ===

export function formatCollectibles(name: string, detail: AnyDetail): string {
  const list: any[] = Array.isArray(detail.collectibles) ? detail.collectibles : [];
  if (list.length === 0) {
    return `${name}은(는) 수집 포인트가 없는 것 같숨미당.`;
  }

  const lines: string[] = [`${name}의 수집 포인트`];
  let totalPercent = 0;
  let totalPoint = 0;
  for (const c of list) {
    const point = c.point ?? 0;
    const max = c.maxPoint ?? 0;
    const percent = max > 0 ? (point / max) * 100 : 0;
    lines.push(` [${c.type}] ${point} (${percent.toFixed(1)}%)`);
    totalPercent += percent;
    totalPoint += point;
  }
  const avg = list.length > 0 ? totalPercent / list.length : 0;
  lines.push(` [전체 진행도] ${totalPoint} (${avg.toFixed(1)}%)`);
  return joinLines(...lines);
}

// === 착장 (아바타 목록) ===

export function formatAvatars(name: string, detail: AnyDetail): string {
  const avatars: any[] = Array.isArray(detail.avatars) ? detail.avatars : [];
  if (avatars.length === 0) {
    return `${name}의 아바타를 불러올 수 없습니다.`;
  }

  const inner: any[] = [];
  const outer: any[] = [];
  for (const a of avatars) {
    const typeShort = String(a.type ?? '').split(' ')[0]?.substring(0, 2) ?? '이동';
    const entry = { type: typeShort || '이동', name: a.name };
    if (a.isInner) inner.unshift(entry);
    else outer.unshift(entry);
  }

  const lines: string[] = [`${sectionHeader(`${name}의 착용중인 아바타`)}`, ''];
  if (outer.length > 0) {
    lines.push('[Outer]');
    for (const a of outer) lines.push(` [${a.type}] ${a.name}`);
  }
  if (inner.length > 0) {
    if (outer.length > 0) lines.push('');
    lines.push('[Inner]');
    for (const a of inner) lines.push(` [${a.type}] ${a.name}`);
  }
  return joinLines(...lines);
}

// === 아바타 URL ===

export function formatAvatarUrl(name: string, detail: AnyDetail): string {
  const url: string | undefined = detail.profile?.characterImage;
  if (!url) return `${name}의 아바타를 찾지 못했습니다.`;
  return `${name}의 아바타\n${url}`;
}

// === 카드 (신규) ===

export function formatCards(name: string, detail: AnyDetail): string {
  const cardsResult = detail.cards;
  if (!cardsResult || (Array.isArray(cardsResult.cards) && cardsResult.cards.length === 0)) {
    return `${name}의 카드 정보를 찾을 수 없습니다.`;
  }

  const cards: any[] = cardsResult.cards ?? [];
  const effects: any[] = cardsResult.effects ?? [];

  const lines: string[] = [sectionHeader(`${name}의 카드`)];

  for (const c of cards) {
    lines.push(`[${c.grade}] ${c.name} (${c.awakeCount}/${c.awakeTotal})`);
  }

  if (effects.length > 0) {
    lines.push('');
    lines.push(sectionHeader('세트 효과'));
    for (const effect of effects) {
      for (const item of effect.items ?? []) {
        lines.push(` ${item.name} : ${item.description}`);
      }
    }
  }

  return joinLines(...lines);
}

// === 전장 (신규) ===

export function formatColosseums(name: string, detail: AnyDetail): string {
  const seasons: any[] = Array.isArray(detail.colosseums) ? detail.colosseums : [];
  if (seasons.length === 0) {
    return `${name}의 증명의 전장 정보를 찾을 수 없습니다.`;
  }

  const lines: string[] = [sectionHeader(`${name}의 증명의 전장`)];

  for (const s of seasons) {
    const modes: Array<{ key: string; label: string }> = [
      { key: 'competitive', label: '경쟁전' },
      { key: 'teamDeathmatch', label: '팀 데스매치' },
      { key: 'teamElimination', label: '팀 섬멸전' },
      { key: 'coOpBattle', label: '협동전' },
      { key: 'oneDeathmatch', label: '개인 데스매치' },
      { key: 'oneDeathmatchRank', label: '개인 데스매치(랭크)' },
    ];

    const active = modes.filter((m) => s[m.key] != null);
    if (active.length === 0) continue;

    lines.push('');
    lines.push(`[${s.seasonName}]`);
    for (const mode of active) {
      const raw: any = s[mode.key];
      const rank = raw?.RankName ?? raw?.rankName ?? raw?.Rank ?? '';
      lines.push(` ${mode.label} : ${rank || '기록 있음'}`);
    }
  }

  if (lines.length === 1) {
    return `${name}의 증명의 전장 기록이 없습니다.`;
  }

  return joinLines(...lines);
}
