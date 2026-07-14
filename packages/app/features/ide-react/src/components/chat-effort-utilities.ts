/**
 * Pure helpers backing the `/effort` command and its status view.
 *
 * Effort is persisted PER MODE (`settings.effortByMode`, with the legacy single
 * `settings.effortLevel` as fallback) as the model's OWN native value — there is
 * no abstract scale. Users see and type the ACTIVE MODEL's own effort values
 * (`xhigh` on Claude Opus 4.8, `medium` on Grok 4.3, `16K` thinking tokens on
 * budget-configurable models …), which vary per model and therefore per mode:
 * plan and execute run different models, so each mode carries its own value
 * chosen from its own model's levels.
 *
 * Command shapes:
 * - `/effort` or `/effort ?` — status for every mode.
 * - `/effort <value>` — set the CURRENT mode's effort to a native value.
 * - `/effort --plan <value>` / `/effort --execute <value>` — set a specific
 *   mode's effort (mirrors `/model --plan` / `--execute`).
 *
 * Deterministic and side-effect free — unit testable without rendering or a
 * backend. User-facing prose lives in the component via `t()`.
 *
 * @module
 */

import type { AppModelDefinition, EffortLevel, EffortOption } from '@molecule/app-ai-models'

export type { EffortLevel, EffortOption }
export {
  defaultEffortForModel,
  effortOptionsForModel,
  nativeEffortName,
} from '@molecule/app-ai-models'

/**
 * Conversation modes that carry their own effort level. Kept as a plain string
 * union locally (mirrors the chat mode type); future modes extend this without
 * changing the settings shape — `effortByMode` is keyed by mode id.
 */
export type EffortMode = 'plan' | 'execute'

/**
 * The parsed result of an `/effort` command:
 *
 * - `set` — apply the (still-unresolved) native value `arg`, optionally scoped
 *   to a specific `mode` via `--plan` / `--execute` (unscoped = current mode).
 *   Resolve `arg` against the target model's options with
 *   {@link resolveEffortArg} — parsing is purely syntactic because the valid
 *   values depend on which model the target mode runs.
 * - `query` — show the status view (`/effort` or `/effort ?`).
 * - `invalid` — unrecognized flags/arguments (the caller shows usage).
 */
export type EffortCommand =
  | { kind: 'set'; arg: string; mode?: EffortMode }
  | { kind: 'query'; mode?: EffortMode }
  | { kind: 'invalid'; arg: string }

/**
 * Parses an `/effort [--plan|--execute] [arg]` command. Purely syntactic — the
 * caller resolves `arg` against the target mode's model via
 * {@link resolveEffortArg}. Returns `null` when the input is not the command.
 *
 * @param input - The raw chat input.
 * @returns The parsed {@link EffortCommand}, or `null`.
 */
export function parseEffortCommand(input: string): EffortCommand | null {
  const match = input.trim().match(/^\/effort(?:\s+(.*))?$/i)
  if (!match) return null
  const tokens = (match[1] ?? '').trim().split(/\s+/).filter(Boolean)
  let mode: EffortMode | undefined
  const rest: string[] = []
  for (const token of tokens) {
    const lower = token.toLowerCase()
    if (lower === '--plan') mode = 'plan'
    else if (lower === '--execute') mode = 'execute'
    else rest.push(token)
  }
  if (rest.length === 0) return { kind: 'query', mode }
  if (rest.length > 1) return { kind: 'invalid', arg: rest.join(' ') }
  const arg = rest[0]
  if (arg === '?') return { kind: 'query', mode }
  return { kind: 'set', arg, mode }
}

/**
 * Resolve a user-typed effort value against a model's selectable options.
 *
 * Matches the model's own native values case-insensitively (`xhigh`, `16K`, …)
 * and returns the canonical value to persist. Returns `null` when the input
 * doesn't name one of the model's levels.
 *
 * @param arg - The raw value the user typed.
 * @param options - The target model's options (see `effortOptionsForModel`).
 * @returns The native value to persist, or `null` when nothing matches.
 */
export function resolveEffortArg(
  arg: string,
  options: readonly EffortOption[],
): EffortLevel | null {
  const lower = arg.toLowerCase()
  return options.find((o) => o.value.toLowerCase() === lower)?.value ?? null
}

/**
 * The catalog models that expose a *configurable* reasoning/thinking budget —
 * i.e. those where the effort level maps onto a provider reasoning param. Models
 * with no configurable budget still get the agent-loop budget applied by the
 * backend, but these are the ones the `?` view highlights.
 *
 * @param models - The available models from the catalog.
 * @returns The models supporting a configurable reasoning budget, in input order.
 */
export function modelsSupportingEffort(
  models: readonly AppModelDefinition[],
): AppModelDefinition[] {
  return models.filter((m) => m.supportsThinking && m.thinkingConfigurable)
}

/**
 * The effort levels the `/effort` command offers and accepts for a *specific*
 * model — the model's own native values, ascending (e.g.
 * `['low', 'high', 'xhigh', 'max']`). Empty for a fixed-reasoning model
 * (`grok-code-fast-1`, the DeepSeek executors) or an unknown model, which
 * expose no effort choice.
 *
 * @param model - The active model to read levels from, or `undefined`.
 * @returns The model's effort levels in ascending order (empty when it has none).
 */
export function effortLevelsForModel(model: AppModelDefinition | undefined): readonly string[] {
  return model?.supportedEffortLevels ?? []
}
