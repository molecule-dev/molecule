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

/**
 * Sortable columns in the `/models` table.
 *
 * `cutoff` (knowledge-cutoff date) replaced a former `tier` column that was
 * fabricated from input price: it duplicated the `cost` axis and was sometimes
 * factually wrong (a slow reasoning model could read "Balanced"). The catalog
 * has no latency field, so rather than invent one we expose `knowledgeCutoff` —
 * a real, factual axis that is genuinely independent of price, context, and
 * output size.
 */
export type ModelSortColumn = 'name' | 'context' | 'cost' | 'cutoff' | 'free'

/** Sort direction. */
export type SortDirection = 'asc' | 'desc'

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
 * Relative usage rate: how much faster this model consumes the user's AI
 * allowance than the cheapest available model (a unitless `×N` multiplier,
 * `1` for the cheapest). Derived from combined input+output list rates. This
 * is the ONLY per-model "cost" figure user-facing surfaces show — AI usage is
 * never presented as currency.
 *
 * @param model - The model to rate.
 * @param models - The full available-model list (supplies the cheapest base).
 * @returns The multiplier, rounded to 1 decimal below 10 and whole above.
 */
export function modelUsageRate(
  model: AppModelDefinition,
  models: readonly AppModelDefinition[],
): number {
  const costs = models.map(modelTotalCost).filter((c) => c > 0)
  const base = costs.length > 0 ? Math.min(...costs) : 0
  if (!Number.isFinite(base) || base <= 0) return 1
  const rate = modelTotalCost(model) / base
  return rate >= 10 ? Math.round(rate) : Math.max(1, Math.round(rate * 10) / 10)
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
    case 'cutoff':
      // Knowledge-cutoff dates are YYYY-MM-DD strings, which sort
      // lexicographically as dates. Ascending puts the oldest training data
      // first.
      primary = a.knowledgeCutoff.localeCompare(b.knowledgeCutoff)
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
