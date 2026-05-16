/**
 * 모든 CommandSpec 을 집계한 CommandRegistry.
 *
 * Phase 별로 명령 모듈이 등록된다. 본 파일은 단일 진입점.
 */

import type { CommandRegistry } from '../routing/router.js';

// Phase 2 — armories
import { profileCommand } from './armories/profile.js';
import { equipmentCommand } from './armories/equipment.js';
import { skillsCommand } from './armories/skills.js';
import { gemsCommand } from './armories/gems.js';
import { engravingsCommand } from './armories/engravings.js';
import { abilityStoneCommand } from './armories/ability-stone.js';
import { collectiblesCommand } from './armories/collectibles.js';
import { avatarsCommand } from './armories/avatars.js';
import { avatarUrlCommand } from './armories/avatar-url.js';
import { cardsCommand } from './armories/cards.js';
import { colosseumsCommand } from './armories/colosseums.js';

// Phase 2 — help
import { helpCommand } from './help/help.js';

// Phase 3 — characters
import { siblingsCommand } from './characters/siblings.js';

// Phase 3 — gamecontents
import { procyonCommand } from './gamecontents/procyon.js';
import { eventCommand } from './gamecontents/event.js';

// Phase 4 — auctions / markets
import { gemSearchCommand } from './auctions/gems.js';
import { expensiveEngravingsCommand } from './markets/expensive-engravings.js';
import { legendaryEngravingCommand } from './markets/legendary-engraving.js';
import { relicEngravingCommand } from './markets/relic-engraving.js';

// Phase 5 — minigame
import { diceCommand } from './minigame/dice.js';
import { pickOneCommand } from './minigame/pick-one.js';
import { shareCommand } from './minigame/share.js';
import { synergyCommand } from './minigame/synergy.js';
import { randomCardCommand } from './minigame/random-card.js';
import { fortuneCommand } from './minigame/fortune.js';

export const commandRegistry: CommandRegistry = {
  // armories
  정보: profileCommand,
  장비: equipmentCommand,
  스킬: skillsCommand,
  보석: gemsCommand,
  각인: engravingsCommand,
  돌: abilityStoneCommand,
  수집: collectiblesCommand,
  착장: avatarsCommand,
  아바타: avatarUrlCommand,
  카드: cardsCommand,
  전장: colosseumsCommand,

  // characters
  부캐: siblingsCommand,

  // gamecontents
  프로키온: procyonCommand,
  이벤트: eventCommand,

  // auctions / markets
  보석값: gemSearchCommand,
  비싼유각: expensiveEngravingsCommand,
  전각: legendaryEngravingCommand,
  유각: relicEngravingCommand,

  // minigame
  주사위: diceCommand,
  vs: pickOneCommand,
  분배금: shareCommand,
  시너지: synergyCommand,
  랜전카: randomCardCommand,
  질문: fortuneCommand,

  // help
  도움말: helpCommand,
};
