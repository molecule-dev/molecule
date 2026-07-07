/**
 * Native effort-level presentation helpers.
 *
 * Molecule persists reasoning effort as an abstract `S | M | L | XL` level —
 * that scale is an INTERNAL encoding only (it lets one project setting span
 * models whose native scales differ, and drives the provider-agnostic
 * agent-loop budget). Users should never see the letters: every user-facing
 * surface (the `/effort` command, settings dropdowns) shows the ACTIVE MODEL's
 * own effort values, which vary per model:
 *
 * - Models with a native effort/level param surface those values verbatim
 *   (e.g. `low | high | xhigh | max` on current Claude models,
 *   `none | low | medium | high` on Grok 4.3), from the catalog's
 *   `effortNativeByLevel`.
 * - Budget-scaled models (a raw token budget, no level names — e.g. Claude
 *   Haiku 4.5, Qwen3.7) surface the scaled thinking budget itself
 *   (`4K | 8K | 16K | 32K`), mirroring the server's budget math.
 * - Fixed-reasoning models (DeepSeek executors, Kimi, MiniMax M2.x) surface
 *   nothing — reasoning depth cannot be tuned, so there is nothing to pick.
 *
 * @module
 */

import type { AppModelDefinition, EffortLevel } from './types.js'

/** All abstract effort levels in ascending order (internal encoding). */
export const EFFORT_LEVELS: readonly EffortLevel[] = ['S', 'M', 'L', 'XL']

/** Default abstract effort level when none is persisted. */
export const DEFAULT_EFFORT_LEVEL: EffortLevel = 'M'

/**
 * One selectable effort option for a specific model.
 */
export interface EffortOption {
  /** Internal persisted encoding (`project.settings.effortByMode` / legacy `effortLevel`). */
  level: EffortLevel
  /**
   * What the user sees and types — the model's OWN effort value (e.g.
   * `'xhigh'`), or a scaled thinking-budget size (e.g. `'16K'`) on
   * budget-scaled models, or the bare abstract level as a last resort for
   * unknown models.
   */
  native: string
}

/**
 * Multiplier applied to a model's configured thinking budget per effort level.
 * MUST mirror the server's `EFFORT_BUDGET_MULTIPLIER` (molecule-dev
 * `model-selection.ts`) so displayed budgets match what is actually sent.
 */
const EFFORT_BUDGET_MULTIPLIER: Record<EffortLevel, number> = { S: 0.5, M: 1, L: 2, XL: 4 }

/** Provider minimum for an extended-thinking budget (mirrors the server). */
const MIN_THINKING_BUDGET = 1024

/**
 * Format a token count for display (e.g. `16000` → `'16K'`).
 *
 * @param tokens - The token count.
 * @returns A compact human-readable size.
 */
function formatTokens(tokens: number): string {
  return tokens >= 1000 ? `${Math.round(tokens / 1000)}K` : String(tokens)
}

/**
 * The effort options a user can pick for a specific model, in ascending order.
 *
 * - Native-level models → the catalog's `effortNativeByLevel` values.
 * - Budget-scaled models → the scaled thinking budgets (`'8K'`, `'16K'`, …),
 *   clamped exactly like the server clamps the real request budget.
 * - Fixed-reasoning models → `[]` (nothing to tune; effort still scales the
 *   agent-loop budget server-side, but there is no per-model value to choose).
 * - Unknown models (`undefined`) → the abstract levels themselves, so a
 *   custom/unlisted model never loses the setting entirely.
 *
 * @param model - The model to build options for, or `undefined` when unknown.
 * @returns The selectable options in `S → XL` order.
 */
export function effortOptionsForModel(model: AppModelDefinition | undefined): EffortOption[] {
  if (!model) return EFFORT_LEVELS.map((level) => ({ level, native: level }))
  const levels = model.supportedEffortLevels?.length ? model.supportedEffortLevels : EFFORT_LEVELS
  const ordered = EFFORT_LEVELS.filter((l) => levels.includes(l))
  const map = model.effortNativeByLevel
  if (map) {
    return ordered
      .filter((level) => typeof map[level] === 'string')
      .map((level) => ({ level, native: map[level] as string }))
  }
  if (model.supportsThinking && model.thinkingConfigurable) {
    const max = Math.max(MIN_THINKING_BUDGET, model.maxOutputTokens - 1)
    return ordered.map((level) => {
      const scaled = Math.round(model.thinkingBudgetTokens * EFFORT_BUDGET_MULTIPLIER[level])
      return { level, native: formatTokens(Math.min(max, Math.max(MIN_THINKING_BUDGET, scaled))) }
    })
  }
  return []
}

/**
 * The user-facing name of a persisted effort level under a specific model —
 * the native value the level resolves to on that model.
 *
 * A persisted level outside the model's supported set degrades to the nearest
 * supported option (ties resolve toward less effort), mirroring the
 * server-side clamp, so the display always matches what the backend will
 * actually send.
 *
 * @param model - The active model (or `undefined` when unknown).
 * @param level - The persisted abstract level.
 * @returns The native display name, or `null` when the model's reasoning is
 *   fixed (nothing to display — callers show their own "fixed" copy).
 */
export function nativeEffortName(
  model: AppModelDefinition | undefined,
  level: EffortLevel,
): string | null {
  const options = effortOptionsForModel(model)
  if (options.length === 0) return null
  const exact = options.find((o) => o.level === level)
  if (exact) return exact.native
  const requestedIdx = EFFORT_LEVELS.indexOf(level)
  let nearest = options[0]
  let nearestDist = Infinity
  for (const option of options) {
    const dist = Math.abs(EFFORT_LEVELS.indexOf(option.level) - requestedIdx)
    if (dist < nearestDist) {
      nearestDist = dist
      nearest = option
    }
  }
  return nearest.native
}
