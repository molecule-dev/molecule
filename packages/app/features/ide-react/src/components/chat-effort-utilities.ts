/**
 * Pure helpers backing the `/effort` command and its status view.
 *
 * Effort is persisted PER MODE (`settings.effortByMode`, with the legacy single
 * `settings.effortLevel` as fallback) using the abstract `S | M | L | XL`
 * encoding — but that scale is internal only. Users see and type the ACTIVE
 * MODEL's own effort values (`xhigh` on Claude Opus 4.8, `medium` on Grok 4.3,
 * `16K` thinking tokens on budget-scaled models …), which vary per model and
 * therefore per mode: plan and execute run different models, so each mode
 * carries its own effort level chosen from its own model's native scale.
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
import { EFFORT_LEVELS as ABSTRACT_EFFORT_LEVELS } from '@molecule/app-ai-models'

export type { EffortLevel, EffortOption }
export {
  DEFAULT_EFFORT_LEVEL,
  EFFORT_LEVELS,
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
 * Type guard for a valid abstract {@link EffortLevel} (case-sensitive — callers
 * upper-case first). The letters are accepted as LEGACY input aliases only;
 * they are never displayed.
 *
 * @param value - The candidate value.
 * @returns `true` when `value` is one of `S`, `M`, `L`, `XL`.
 */
export function isEffortLevel(value: string): value is EffortLevel {
  return (ABSTRACT_EFFORT_LEVELS as readonly string[]).includes(value)
}

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
 * Matches the model's NATIVE values case-insensitively (`xhigh`, `16K`, …);
 * the abstract letters (`s/m/l/xl`) are still accepted as legacy aliases so
 * old muscle memory and docs keep working. The caller still validates the
 * resolved level against the model's supported set (a legacy letter can name
 * a level the model doesn't offer).
 *
 * @param arg - The raw value the user typed.
 * @param options - The target model's options (see `effortOptionsForModel`).
 * @returns The abstract level to persist, or `null` when nothing matches.
 */
export function resolveEffortArg(
  arg: string,
  options: readonly EffortOption[],
): EffortLevel | null {
  const lower = arg.toLowerCase()
  const native = options.find((o) => o.native.toLowerCase() === lower)
  if (native) return native.level
  const upper = arg.toUpperCase()
  return isEffortLevel(upper) ? upper : null
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
 * The effort levels the `/effort` command should offer and accept for a *specific*
 * model. Different models support different reasoning levels (e.g. a fully
 * configurable model exposes the whole `S | M | L | XL` scale, while a
 * fixed-reasoning model like `grok-code-fast-1` exposes only the default `M`), so
 * the command must surface and validate only what the active model actually
 * supports.
 *
 * Reads the model's catalog-declared {@link AppModelDefinition.supportedEffortLevels}.
 * Falls back to the full {@link EFFORT_LEVELS} scale when the field is absent
 * (back-compat) or empty, or when the model is unknown (`undefined`) — so a
 * missing/unpriced model never silently forbids every level.
 *
 * @param model - The active model to read supported levels from, or `undefined`.
 * @returns The supported effort levels in ascending order (the full scale when none are declared).
 */
export function effortLevelsForModel(
  model: AppModelDefinition | undefined,
): readonly EffortLevel[] {
  const levels = model?.supportedEffortLevels
  return levels && levels.length > 0 ? levels : ABSTRACT_EFFORT_LEVELS
}
