/**
 * !도움말 / !명령어
 *
 * registry 의 enabled 명령을 순회하여 자동으로 사용 가능 명령 목록을 출력한다.
 * 인자가 있으면 해당 명령의 description 단일 출력.
 *
 * NOTE: registry 의 lookup 은 createRouter 가 내부에 갖는다. 본 명령은
 * 라우터의 `listing` 을 직접 쓰지 못하므로 (순환 의존 회피), commandRegistry
 * 를 lazy import 하여 description 만 추출한다.
 */

import type { CommandSpec } from '../../routing/router.js';

export const helpCommand: CommandSpec = {
  minArgs: 0,
  usage: '!도움말 [명령]',
  description: '지원하는 명령 목록을 출력',
  aliases: ['명령어'],
  handler: async (args, _message, _ctx) => {
    // 순환 import 회피용 dynamic import.
    const { commandRegistry } = await import('../registry.js');

    if (args.length > 0) {
      const target = args[0]!;
      const spec = commandRegistry[target];
      if (spec && spec.enabled !== false) {
        return `[${target}] ${spec.description}`;
      }
      // alias 검색
      for (const [name, s] of Object.entries(commandRegistry)) {
        if (s.aliases?.includes(target) && s.enabled !== false) {
          return `[${target}] ${s.description} (별칭: ${name})`;
        }
      }
      return `[${target}] 알 수 없는 명령입니다.`;
    }

    const lines: string[] = ['[접두사] !'];
    for (const [name, spec] of Object.entries(commandRegistry)) {
      if (spec.enabled === false) continue;
      lines.push(`[${name}] ${spec.description}`);
    }
    return lines.join('\n');
  },
};
