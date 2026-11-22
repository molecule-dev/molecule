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
 * - `/effort` — open the selectable level picker (mirrors `/model`'s picker).
 * - `/effort ?` — textual status for every mode.
 * - `/effort <value>` — set the CURRENT mode's effort to a native value.
 * - `/effort --plan <value>` / `/effort --execute <value>` — set a specific
 *   mode's effort (mirrors `/model --plan` / `--execute`); the flag alone
 *   opens the picker scoped to that mode.
 *
 * Deterministic and side-effect free — unit testable without rendering or a
 * backend. User-facing prose lives in the component via `t()`.
 *
 * @module
 */

import type { AppModelDefinition, EffortLevel, EffortOption } from '@molecule/app-ai-models'
import { effortOptionsForModel, nativeEffortName } from '@molecule/app-ai-models'
import type { TranslateFunction } from '@molecule/app-i18n'

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
 * - `menu` — open the selectable level picker (bare `/effort`, or a bare
 *   `--plan` / `--execute` flag scoping it), mirroring how bare `/model`
 *   opens the model picker.
 * - `query` — show the textual status view (`/effort ?`).
 * - `invalid` — unrecognized flags/arguments (the caller shows usage).
 */
export type EffortCommand =
  | { kind: 'set'; arg: string; mode?: EffortMode }
  | { kind: 'menu'; mode?: EffortMode }
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
  if (rest.length === 0) return { kind: 'menu', mode }
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
 * `['low', 'high', 'xhigh', 'max']`, or `['off', 'low', 'high', 'max']` on an
 * opt-in reasoning model where `off` is the local toggle). Empty for a
 * model with no selectable effort levels, or an unknown model.
 *
 * @param model - The active model to read levels from, or `undefined`.
 * @returns The model's effort levels in ascending order (empty when it has none).
 */
export function effortLevelsForModel(model: AppModelDefinition | undefined): readonly string[] {
  return model?.supportedEffortLevels ?? []
}

/**
 * The effort levels the open `/effort` picker lists, narrowed by any typed
 * filter: the text after `/effort` (minus a mode flag) matches case-insensitively
 * against each level's native value, so `/effort xh` narrows to `xhigh`. With no
 * typed query every option is listed.
 *
 * @param text - The picker's raw input text.
 * @param options - The scoped mode's model's options (see {@link effortOptionsForModel}).
 * @returns The options matching the typed query (the whole list when empty).
 */
export function effortPickerVisibleOptions(
  text: string,
  options: readonly EffortOption[],
): EffortOption[] {
  const typed = parseEffortCommand(text)
  const q = typed?.kind === 'set' ? typed.arg.toLowerCase() : ''
  if (!q) return [...options]
  return options.filter((o) => o.value.toLowerCase().includes(q))
}

/**
 * The localized one-line status of a mode's reasoning effort — the `/effort ?`
 * view's per-mode line. States whether the mode's model is fixed (one reasoning
 * mode) or lists its current level and every available one.
 *
 * @param t - The caller's translate function (React passes `useTranslation()`'s `t`).
 * @param mode - The conversation mode to describe.
 * @param model - The model the mode will actually run, or `undefined`.
 * @param currentEffort - The persisted per-mode value (or the legacy fallback).
 * @returns The localized status line.
 */
export function effortModeStatusLine(
  t: TranslateFunction,
  mode: EffortMode,
  model: AppModelDefinition | undefined,
  currentEffort: EffortLevel | undefined,
): string {
  const options = effortOptionsForModel(model)
  const current = nativeEffortName(model, currentEffort)
  return current === null || options.length === 0
    ? t(
        'ide.chat.effort.modeFixed',
        { mode, model: model?.label ?? '?' },
        { defaultValue: '  {{mode}} ({{model}}): fixed — this model has one reasoning mode' },
      )
    : t(
        'ide.chat.effort.modeLine',
        {
          mode,
          model: model?.label ?? '?',
          current,
          levels: options.map((o) => o.value).join(', '),
        },
        { defaultValue: '  {{mode}} ({{model}}): {{current}} — available: {{levels}}' },
      )
}
