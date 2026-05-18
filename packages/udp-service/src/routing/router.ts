/**
 * 명령 라우터.
 *
 * - CommandRegistry 를 받아 단일 lookup 맵을 구성하고 dispatch 를 제공한다.
 * - 모르는 명령 / disabled 명령 → silent drop (`null` 반환).
 * - argsLength 부족 → CommandSpec.usage 문자열을 reply 로 돌려준다.
 * - handler 가 throw 한 경우 친화적인 한 줄 메시지로 마스킹.
 */

import type { KakaoMessage } from '../contracts/envelope.js';
import type { ServiceContext } from '../services/service-context.js';
import type { ParsedCommand } from './parser.js';

/**
 * 명령 핸들러.
 * @returns 응답 문자열, 또는 silent drop 을 의미하는 `null`.
 */
export type CommandHandler = (
  args: string[],
  message: KakaoMessage,
  ctx: ServiceContext,
) => Promise<string | null>;

export interface CommandSpec {
  handler: CommandHandler;
  /** 최소 인자 수. 미달 시 `usage` 를 reply. */
  minArgs: number;
  /** minArgs 미달 시 사용자에게 돌려줄 사용법 문자열. */
  usage: string;
  /** 별칭 명령명 (예: '명령어' → 'help'). */
  aliases?: string[];
  /** 도움말 출력용 설명. */
  description: string;
  /** false 면 라우터가 등록 자체를 무시 (재련 게임 보존용). 기본 true. */
  enabled?: boolean;
}

export type CommandRegistry = Record<string, CommandSpec>;

export interface Router {
  /**
   * 파싱된 명령을 디스패치한다.
   * @returns reply 문자열 또는 silent drop 용 null.
   */
  dispatch(
    parsed: ParsedCommand,
    message: KakaoMessage,
    ctx: ServiceContext,
  ): Promise<string | null>;

  /** 등록된 (enabled) 명령명 + spec 매핑. 도움말 빌더가 사용. */
  readonly listing: ReadonlyArray<{ name: string; spec: CommandSpec }>;
}

export function createRouter(registry: CommandRegistry): Router {
  // 1) lookup 맵 구성: alias 도 같은 spec 으로 매핑
  const lookup = new Map<string, CommandSpec>();
  const listing: Array<{ name: string; spec: CommandSpec }> = [];

  for (const [name, spec] of Object.entries(registry)) {
    if (spec.enabled === false) continue;
    if (lookup.has(name)) {
      throw new Error(`Duplicate command registration: ${name}`);
    }
    lookup.set(name, spec);
    listing.push({ name, spec });

    for (const alias of spec.aliases ?? []) {
      if (lookup.has(alias)) {
        throw new Error(`Duplicate command alias: ${alias} (conflict with ${name})`);
      }
      lookup.set(alias, spec);
    }
  }

  return {
    listing,
    async dispatch(parsed, message, ctx) {
      const spec = lookup.get(parsed.name);
      if (!spec) {
        // 모르는 명령은 silent drop. 다른 봇과의 prefix 충돌 회피.
        return null;
      }

      if (parsed.args.length < spec.minArgs) {
        return spec.usage;
      }

      try {
        return await spec.handler(parsed.args, message, ctx);
      } catch (err) {
        ctx.logger.warn(
          {
            command: parsed.name,
            args: parsed.args,
            err: err instanceof Error ? err.message : String(err),
          },
          'Command handler threw',
        );
        return `${parsed.name} 처리 중 오류가 발생했습니다.`;
      }
    },
  };
}
