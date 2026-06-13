/**
 * Pure helpers backing the `/models` comparison table.
 *
 * Sorting is split out from the React component so the comparator can be unit
 * tested without rendering. All functions are deterministic and side-effect
 * free.
 *
 * @module
 */

import type { AppModelDefinition } from '@molecule/app-ai-models'

/** Sortable columns in the `/models` table. */
export type ModelSortColumn = 'name' | 'context' | 'cost' | 'tier' | 'free'

/** Sort direction. */
export type SortDirection = 'asc' | 'desc'

/** A derived speed/tier classification for a model. */
export interface ModelSpeedTier {
  /** Ordering rank (lower = faster/cheaper). */
  rank: number
  /** Display label. */
  label: string
}

/**
 * Combined input + output price per million tokens, used as the table's
 * single "cost/1M tokens" figure.
 *
 * @param model - The model metadata.
 * @returns Sum of input and output price per million tokens in USD.
 */
export function modelTotalCost(model: AppModelDefinition): number {
  return model.inputPricePerMTok + model.outputPricePerMTok
}

/**
 * Derives a speed/tier classification from the model's input price. There is no
 * dedicated latency field in the catalog, so price is used as a stable,
 * provider-agnostic proxy: cheaper models are generally the faster/lighter
 * tiers. Thresholds mirror the price-color buckets used in the model picker
 * (≤ $1, ≤ $3, > $3 input per million tokens).
 *
 * @param model - The model metadata.
 * @returns The model's tier rank and display label.
 */
export function modelSpeedTier(model: AppModelDefinition): ModelSpeedTier {
  if (model.inputPricePerMTok <= 1) return { rank: 0, label: 'Fast' }
  if (model.inputPricePerMTok <= 3) return { rank: 1, label: 'Balanced' }
  return { rank: 2, label: 'Powerful' }
}

/**
 * Ascending comparator for two models by the given column. Returns a negative,
 * zero, or positive number suitable for `Array.prototype.sort`. Ties fall back
 * to label order so the sort is stable and deterministic.
 *
 * @param a - First model.
 * @param b - Second model.
 * @param column - Column to compare by.
 * @returns Negative if `a` sorts before `b`, positive if after, zero if equal.
 */
export function compareModels(
  a: AppModelDefinition,
  b: AppModelDefinition,
  column: ModelSortColumn,
): number {
  let primary: number
  switch (column) {
    case 'name':
      primary = a.label.localeCompare(b.label)
      break
    case 'context':
      primary = a.contextWindow - b.contextWindow
      break
    case 'cost':
      primary = modelTotalCost(a) - modelTotalCost(b)
      break
    case 'tier':
      primary = modelSpeedTier(a).rank - modelSpeedTier(b).rank
      break
    case 'free':
      // Free-tier models sort first in ascending order.
      primary = (b.freeTier ? 1 : 0) - (a.freeTier ? 1 : 0)
      break
  }
  if (primary !== 0) return primary
  // Stable tiebreak by label so equal rows keep a deterministic order.
  return a.label.localeCompare(b.label)
}

/**
 * Returns a new array of models sorted by the given column and direction.
 * Does not mutate the input.
 *
 * @param models - Models to sort.
 * @param column - Column to sort by.
 * @param direction - `'asc'` or `'desc'`.
 * @returns A new, sorted array.
 */
export function sortModels(
  models: readonly AppModelDefinition[],
  column: ModelSortColumn,
  direction: SortDirection,
): AppModelDefinition[] {
  // Swapping the comparator arguments for `'desc'` fully reverses the order
  // (including the label tiebreak) without relying on Array#sort stability.
  return [...models].sort((a, b) =>
    direction === 'desc' ? compareModels(b, a, column) : compareModels(a, b, column),
  )
}
