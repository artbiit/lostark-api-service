/**
 * armories 그룹 명령(정보/장비/스킬/보석/각인/돌/수집/착장/아바타/카드/전장)의
 * 카카오톡 텍스트 포맷 함수 모음.
 *
 * legacy/src/Service/Commands/armories.js 의 텍스트 컨벤션을 의미적으로 모방한다.
 * 단, 데이터 소스는 ArmoriesService.getCharacterDetailPartial 의 normalized 응답.
 *
 * V9 / 아크패시브 시즌 기준 재기획 (.claude/work-session/20260517-010704/design.md):
 *  - `!정보` 의 각인 3줄/돌 오우너 라인 폐기. 진/깨/도·엘초상·전투특성 등은 유지.
 *  - `!돌` 은 detail.abilityStone (NormalizedAbilityStone) 만 읽고 raw tooltip 재파싱 폐기.
 *  - `!각인` 은 ArkPassive 활성 일관 형식 (level desc, name asc), 비활성 fallback 잔존.
 *  - 모든 빈 응답을 `~ 없는 것 같숨미당` 톤으로 통일.
 *  - `!스킬` ≤30 라인 / `!전장` ≤3 시즌 절단 가드.
 */

import {
  elapsedTime,
  EMOJI,
  joinLines,
  padItemLevel,
  padQuality,
  padTwoDigit,
  sectionHeader,
  truncateLines,
} from './kakao.js';

// 응답 타입은 NormalizedCharacterDetail 의 Partial 이라 any-ish. 안전하게 narrow.
type AnyDetail = Record<string, any>;

/**
 * 카카오톡 단일 메시지 라인 가드 (design §1.4).
 * `!스킬` 본문이 30 라인을 넘기면 마지막 라인을 `... 외 N개 생략` 으로 치환.
 */
const KAKAO_MAX_LINES = 30;

// === 정보 ===

export function formatProfile(name: string, detail: AnyDetail): string {
  const profile = detail.profile ?? {};
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

  // (빈 줄)
  lines.push('');

  // 3. 템/전 — itemLevel / combatPower
  const itemLevel = detail.itemLevel ?? 0;
  const combatPower = detail.combatPower ?? 0;
  lines.push(`템/전\t${itemLevel}/${combatPower}`);
  // 3-1. 원정대 (별행)
  lines.push(`원정대\t${detail.expeditionLevel ?? 0}`);

  // 4. 서버/길드 + 길드 등급
  const serverLabel = detail.serverName || '알 수 없음';
  if (detail.guildName) {
    const grade = detail.guildMemberGrade ? `의 ${detail.guildMemberGrade}` : '';
    lines.push(`서버/길드\t${serverLabel}/${detail.guildName}${grade}`);
  } else {
    lines.push(`서버/길드\t${serverLabel}/없음`);
  }

  const stats: any[] = profile.stats ?? [];
  // 5. 전투특성
  if (stats.length >= 4) {
    const combat = stats.filter((s: any) => /치명|특화|제압|신속|인내|숙련/.test(s.type));
    combat.sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0));
    const top2 = combat.slice(0, 2);
    if (top2.length === 2) {
      lines.push(`전투특성\t${top2[0].type[0]}:${top2[0].value} ${top2[1].type[0]}:${top2[1].value}`);
    }
  }

  // 6. 스킬포인트
  if (profile.skillPoints) {
    lines.push(`스킬포인트\t${profile.skillPoints.used}/${profile.skillPoints.total}`);
  }

  // 7. pvp
  if (profile.pvpGrade) {
    lines.push(`pvp\t${profile.pvpGrade}`);
  }

  // 8. 공격력/체력
  const attack = stats.find?.((s: any) => s.type === '공격력');
  const hp = stats.find?.((s: any) => s.type === '최대 생명력');
  if (attack && hp) {
    lines.push(`공격력/체력\t${attack.value}/${hp.value}`);
  }

  // 9. 엘/초/상 (equipment 가 partial 응답에 포함됐을 때만 의미 있음)
  const equipment = Array.isArray(detail.equipment) ? detail.equipment : [];
  if (equipment.length > 0) {
    const eq = summarizeEquipmentForProfile(equipment);
    lines.push(
      `엘/초/상\t${eq.elixirTotal}/${eq.transcendenceTotal}/${eq.advancedReforgeTotal}`,
    );
  }

  // 10. 진/깨/도 (ArkPassive 활성 시)
  if (ark) {
    lines.push(`진/깨/도\t${ark.points.evolution}/${ark.points.realization}/${ark.points.leap}`);
  }

  // 11. 성향
  const tendencies: any[] = profile.tendencies ?? [];
  for (let i = 0; i + 1 < tendencies.length; i += 2) {
    const t1 = tendencies[i];
    const t2 = tendencies[i + 1];
    lines.push(`${t1.type}/${t2.type}\t${t1.point}/${t2.point}`);
  }

  // 12-13. 갱신 시간
  const updatedAt = detail.metadata?.normalizedAt;
  if (updatedAt) {
    lines.push('');
    lines.push('');
    lines.push(`갱신된 시간 ${elapsedTime(updatedAt)}`);
  }

  return joinLines(...lines);
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
    return `${name} 은(는) 장착중인 장비가 없는 것 같숨미당.`;
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

// 룬 tooltip JSON 의 ItemPartBox 중 "스킬 룬 효과" 항목에서 Element_001 효과 문구만 추출.
function extractRuneEffect(tooltipRaw: unknown): string {
  if (typeof tooltipRaw !== 'string' || !tooltipRaw) return '';
  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(removeHtmlTags(tooltipRaw));
  } catch {
    return '';
  }
  for (const k of Object.keys(parsed)) {
    const el = parsed[k];
    if (el?.type !== 'ItemPartBox') continue;
    const label = el.value?.Element_000;
    if (typeof label !== 'string' || !label.includes('스킬 룬 효과')) continue;
    const text = el.value?.Element_001;
    if (typeof text === 'string' && text.trim()) return text.trim();
  }
  return '';
}

// === 스킬 ===

export function formatSkills(name: string, detail: AnyDetail): string {
  const skills: any[] = Array.isArray(detail.combatSkills) ? detail.combatSkills : [];
  const filtered = skills.filter((s) => (s.level ?? 0) >= 2);
  if (filtered.length === 0) {
    return `${name} 은(는) Lv.2 이상 스킬이 없는 것 같숨미당.`;
  }

  const lines: string[] = [sectionHeader(`${name}의 스킬`)];
  const tripods: Record<string, Array<{ name: string; level: number; slot: number }>> = {};

  for (const skill of filtered) {
    let txt = `Lv.${skill.level}${skill.level < 10 ? '  ' : ' '}${skill.name}`;
    if (skill.rune) {
      const grade = skill.rune.grade ?? '';
      txt += ` [${grade[0] ?? ''} ${skill.rune.name}]`;
      const effect = extractRuneEffect(skill.rune.tooltip);
      if (effect) txt += ` ${effect}`;
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
      // 트라이포드 레벨은 V9 시점 응답에서 제거 — lvStr 이 빈 문자열이면 슬래시도 생략.
      const lvStr = ts.map((t) => t.level).filter((v) => v !== undefined && v !== null).join('');
      lines.push(lvStr ? `[${key}] ${slotStr}/${lvStr}` : `[${key}] ${slotStr}`);
    }
  }

  return joinLines(...truncateLines(lines, KAKAO_MAX_LINES));
}

// === 보석 ===

export function formatGems(name: string, detail: AnyDetail): string {
  const gems: any[] = Array.isArray(detail.gems) ? detail.gems : [];
  if (gems.length === 0) {
    return `${name} 은(는) 장착중인 보석이 없는 것 같숨미당.`;
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
    return `${name} 은(는) 장착중인 각인이 없는 것 같숨미당.`;
  }

  // ArkPassive 활성: normalizer 가 level/grade 를 채워줌 → 정렬 후 [등급] 이름 Lv.N
  //   정렬 기준: level desc, name asc.
  // 비활성 (legacy 잔존 분기): level/grade 부재 → 이름만 fallback (`[name]`).
  const sorted = [...list].sort((a: any, b: any) => {
    const la = typeof a.level === 'number' ? a.level : -1;
    const lb = typeof b.level === 'number' ? b.level : -1;
    if (la !== lb) return lb - la;
    return String(a.name ?? '').localeCompare(String(b.name ?? ''));
  });

  const lines: string[] = [`${name}의 각인`];
  for (const e of sorted) {
    if (typeof e.level === 'number' && typeof e.grade === 'string' && e.grade.length > 0) {
      lines.push(` [${e.grade}] ${e.name} Lv.${e.level}`);
    } else {
      lines.push(` [${e.name}]`);
    }
  }
  return joinLines(...lines);
}

// === 어빌리티 스톤 ===

/**
 * 신 사양 (design §6.6):
 *  - 입력: detail.abilityStone (NormalizedAbilityStone | null). raw tooltip 재파싱 폐기.
 *  - 분류: kind ∈ {engraving, debuff, level-bonus}.
 *  - 정렬: engravings 는 level desc. debuffs/level-bonus 는 발견 순서.
 *  - 빈 가드: stone == null → `~ 장착중인 스톤이 없는 것 같숨미당`.
 */
export function formatAbilityStone(name: string, detail: AnyDetail): string {
  const stone = detail.abilityStone ?? null;
  if (!stone) {
    return `${name} 은(는) 장착중인 스톤이 없는 것 같숨미당.`;
  }

  const effects: any[] = Array.isArray(stone.engravingEffects) ? stone.engravingEffects : [];

  const engravings = effects
    .filter((e: any) => e.kind === 'engraving')
    .sort((a: any, b: any) => (b.level ?? 0) - (a.level ?? 0));
  const debuffs = effects.filter((e: any) => e.kind === 'debuff');
  const levelBonus = effects.find((e: any) => e.kind === 'level-bonus');

  const lines: string[] = [
    `${name}의 어빌리티 스톤`,
    `[${stone.grade ?? ''}] ${stone.name ?? ''}`,
  ];

  if (engravings.length > 0) {
    lines.push('', '[각인]');
    for (const e of engravings) lines.push(` [${e.name}] Lv.${e.level}`);
  }
  if (debuffs.length > 0) {
    lines.push('', '[디버프]');
    for (const e of debuffs) lines.push(` [${e.name}] Lv.${e.level}`);
  }
  if (levelBonus?.bonusText) {
    lines.push('', '[레벨 보너스]', ` ${levelBonus.bonusText}`);
  }
  if (stone.craftingBonus) {
    lines.push('', '[세공]', ` ${stone.craftingBonus}`);
  }

  return joinLines(...lines);
}

// === 수집 ===

export function formatCollectibles(name: string, detail: AnyDetail): string {
  const list: any[] = Array.isArray(detail.collectibles) ? detail.collectibles : [];
  if (list.length === 0) {
    return `${name} 은(는) 수집 포인트가 없는 것 같숨미당.`;
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
    return `${name} 은(는) 착용 아바타가 없는 것 같숨미당.`;
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
  if (!url) return `${name} 의 아바타가 없는 것 같숨미당.`;
  return `${name}의 아바타\n${url}`;
}

// === 카드 (신규) ===

export function formatCards(name: string, detail: AnyDetail): string {
  const cardsResult = detail.cards;
  if (!cardsResult || (Array.isArray(cardsResult.cards) && cardsResult.cards.length === 0)) {
    return `${name} 은(는) 장착중인 카드가 없는 것 같숨미당.`;
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
  const allSeasons: any[] = Array.isArray(detail.colosseums) ? detail.colosseums : [];
  if (allSeasons.length === 0) {
    return `${name} 은(는) 증명의 전장 기록이 없는 것 같숨미당.`;
  }

  // active 모드 보유 시즌만 추리고, 5 시즌 이상이면 최근 3 시즌만 (design §1.4 라인 가드).
  const modes: Array<{ key: string; label: string }> = [
    { key: 'competitive', label: '경쟁전' },
    { key: 'teamDeathmatch', label: '팀 데스매치' },
    { key: 'teamElimination', label: '팀 섬멸전' },
    { key: 'coOpBattle', label: '협동전' },
    { key: 'oneDeathmatch', label: '개인 데스매치' },
    { key: 'oneDeathmatchRank', label: '개인 데스매치(랭크)' },
  ];

  const activeSeasons = allSeasons.filter((s: any) => modes.some((m) => s[m.key] != null));
  if (activeSeasons.length === 0) {
    return `${name} 은(는) 증명의 전장 기록이 없는 것 같숨미당.`;
  }
  // 5 시즌 이상이면 최근 3 시즌만. 입력 순서를 시간순 (오래된 → 최신) 으로 가정하고 끝 3개를 취함.
  const seasons = activeSeasons.length >= 5 ? activeSeasons.slice(-3) : activeSeasons;

  const lines: string[] = [sectionHeader(`${name}의 증명의 전장`)];

  for (const s of seasons) {
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

  return joinLines(...lines);
}
