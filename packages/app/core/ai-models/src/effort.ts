/**
 * Per-model effort helpers.
 *
 * Reasoning effort is a model's OWN native level — there is no abstract
 * cross-model scale. The value a user picks, that gets persisted
 * (`settings.effortByMode` / legacy `settings.effortLevel`), and that the
 * `/effort` command shows is the model's real level:
 *
 * - Native-effort models expose their provider values verbatim
 *   (`low | high | xhigh | max` on current Claude models,
 *   `none | low | medium | high` on Grok 4.3).
 * - Budget-configurable models (a raw thinking-token budget, no level names —
 *   Claude Haiku 4.5, Qwen3.7) expose scaled-budget labels
 *   (`4K | 8K | 16K | 32K`), pre-computed in the catalog.
 * - Fixed-reasoning models (DeepSeek executors, Kimi, …) expose nothing —
 *   reasoning depth can't be tuned.
 *
 * These mirror the server-side resolution in molecule-dev `model-selection.ts`;
 * keep the two in sync.
 *
 * @module
 */

import type { AppModelDefinition } from './types.js'

/** One selectable effort option for a model — its own native value. */
export interface EffortOption {
  /** The native value the user sees, types, and that gets persisted. */
  value: string
}

/**
 * Legacy abstract levels — recognized ONLY to migrate settings persisted before
 * effort became per-model-native. Mapped by position onto the model's own
 * levels; new writes are always native values, so these age out.
 */
const LEGACY_ABSTRACT_LEVELS = ['S', 'M', 'L', 'XL']

/**
 * Global order over the known native effort NAMES — used only to degrade a
 * persisted value onto a model that doesn't offer it. Budget labels aren't
 * ranked (a cross-family switch falls back to the model's default).
 */
const EFFORT_NAME_RANK: Record<string, number> = {
  none: 0,
  minimal: 1,
  low: 2,
  medium: 3,
  high: 4,
  xhigh: 5,
  max: 6,
}

/**
 * The effort options a user can pick for a model, in ascending order — the
 * model's own `supportedEffortLevels`. Empty for fixed-reasoning models (and
 * unknown models), which expose no effort choice.
 *
 * @param model - The model to build options for, or `undefined` when unknown.
 * @returns The selectable options (empty when the model has no effort levels).
 */
export function effortOptionsForModel(model: AppModelDefinition | undefined): EffortOption[] {
  return (model?.supportedEffortLevels ?? []).map((value) => ({ value }))
}

/**
 * The model's default effort value (used when the user hasn't chosen), or `null`
 * when the model has no effort levels.
 *
 * @param model - The model (or `undefined`).
 * @returns The default native value, or `null`.
 */
export function defaultEffortForModel(model: AppModelDefinition | undefined): string | null {
  const levels = model?.supportedEffortLevels
  if (!levels || levels.length === 0) return null
  return model?.defaultEffortLevel ?? levels[Math.floor((levels.length - 1) / 2)]
}

/**
 * Resolve a persisted effort value to the one the model will actually use — its
 * exact value, a legacy `S|M|L|XL` mapped by position, the nearest native level
 * by rank, or the model's default. `null` when the model has no effort levels
 * (fixed reasoning — callers show their own "fixed" copy). Mirrors the
 * server-side `resolveEffortForModel` so the display always matches what the
 * backend sends.
 *
 * @param model - The active model (or `undefined`).
 * @param value - The persisted effort value (or `undefined`).
 * @returns The resolved native value, or `null` when reasoning is fixed.
 */
export function nativeEffortName(
  model: AppModelDefinition | undefined,
  value: string | undefined,
): string | null {
  const levels = model?.supportedEffortLevels
  if (!levels || levels.length === 0) return null
  const fallback = model?.defaultEffortLevel ?? levels[Math.floor((levels.length - 1) / 2)]
  if (!value) return fallback
  if (levels.includes(value)) return value
  const legacyIdx = LEGACY_ABSTRACT_LEVELS.indexOf(value)
  if (legacyIdx !== -1) {
    const pos = Math.round((legacyIdx / (LEGACY_ABSTRACT_LEVELS.length - 1)) * (levels.length - 1))
    return levels[pos]
  }
  const wantRank = EFFORT_NAME_RANK[value]
  if (wantRank != null) {
    let nearest: string | null = null
    let best = Infinity
    for (const level of levels) {
      const rank = EFFORT_NAME_RANK[level]
      if (rank == null) continue
      const dist = Math.abs(rank - wantRank)
      if (dist < best) {
        best = dist
        nearest = level
      }
    }
    if (nearest) return nearest
  }
  return fallback
}
