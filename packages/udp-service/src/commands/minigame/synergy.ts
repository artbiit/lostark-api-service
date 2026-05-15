import type { CommandSpec } from '../../routing/router.js';
import { SYNERGY_TEXT } from './synergy-text.js';

export const synergyCommand: CommandSpec = {
  minArgs: 0,
  usage: '!시너지',
  description: '딜러의 시너지 목록',
  handler: async () => SYNERGY_TEXT,
};
