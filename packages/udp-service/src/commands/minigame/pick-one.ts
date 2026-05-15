import type { CommandSpec } from '../../routing/router.js';

export const pickOneCommand: CommandSpec = {
  minArgs: 2,
  usage: '!vs A B [C…]',
  description: 'or 고민, 둘 이상 중 하나 골라주기',
  aliases: ['고민'],
  handler: async (args) => {
    const idx = Math.floor(Math.random() * args.length);
    return `당연히 ${args[idx]}!`;
  },
};
