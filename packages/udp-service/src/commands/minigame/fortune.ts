import type { CommandSpec } from '../../routing/router.js';

export const fortuneCommand: CommandSpec = {
  minArgs: 0,
  usage: '!질문',
  description: '그래 또는 안돼',
  handler: async (_args, message) => {
    const name = message.sender.name;
    return Math.random() > 0.5 ? `그 ${name} 래` : `안 ${name} 돼`;
  },
};
