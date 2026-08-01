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
export type ModelSortColumn = 'name' | 'context' | 'cost' | 'cutoff' | 'free' | 'region'

/** Sort direction. */
export type SortDirection = 'asc' | 'desc'

/**
 * Processing region of a model, as an arbitrary region code (`'us'`, `'cn'`,
 * potentially `'eu'` etc. later). `'us'` is the platform default; deliberately
 * NOT a closed union so adding a region never changes this contract.
 */
export type ModelProcessingRegion = string

/**
 * Resolve a model's effective processing region: the requested region when the
 * model's `regions` list offers it, else the model's DEFAULT region (the first
 * listed; `'us'` when the catalog omits regions). A single-entry list pins the
 * model regardless of the request. Mirrors the server-side
 * `effectiveModelRegion` in `@molecule/api-resource-ai-models`.
 *
 * @param model - The model metadata.
 * @param requested - The user's per-model region choice, if any.
 * @returns The effective region code.
 */
export function effectiveModelRegion(
  model: AppModelDefinition,
  requested?: string,
): ModelProcessingRegion {
  const regions = model.regions ?? ['us']
  return requested && regions.includes(requested) ? requested : regions[0]
}

/**
 * Combined input + output price per million tokens, used as the single
 * "cost/1M tokens" figure — at the rates of the model's effective region
 * (`regionPricing` override when the region has one, else the base rates).
 *
 * @param model - The model metadata.
 * @param region - The user's per-model region choice, if any (omitted → the
 *   model's default region).
 * @returns Sum of input and output price per million tokens in USD.
 */
export function modelTotalCost(model: AppModelDefinition, region?: string): number {
  const override = model.regionPricing?.[effectiveModelRegion(model, region)]
  return override
    ? override.inputPricePerMTok + override.outputPricePerMTok
    : model.inputPricePerMTok + model.outputPricePerMTok
}

/**
 * Relative usage rate: how much faster this model consumes the user's AI
 * allowance than the cheapest available model (a unitless `×N` multiplier,
 * `1` for the cheapest). Derived from combined input+output list rates. This
 * is the ONLY per-model "cost" figure user-facing surfaces show — AI usage is
 * never presented as currency.
 *
 * The base is every model's DEFAULT-region cost (stable regardless of the
 * user's per-model region choices); the rated model itself is priced at the
 * given region so the figure tracks what a region switch actually changes.
 *
 * @param model - The model to rate.
 * @param models - The full available-model list (supplies the cheapest base).
 * @param region - The rated model's region choice, if any (omitted → its
 *   default region).
 * @returns The multiplier, rounded to 1 decimal below 10 and whole above.
 */
export function modelUsageRate(
  model: AppModelDefinition,
  models: readonly AppModelDefinition[],
  region?: string,
): number {
  const costs = models.map((m) => modelTotalCost(m)).filter((c) => c > 0)
  const base = costs.length > 0 ? Math.min(...costs) : 0
  if (!Number.isFinite(base) || base <= 0) return 1
  const rate = modelTotalCost(model, region) / base
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
 * @param regionOf - Resolves a model's effective processing region (used by
 *   the `'region'` and `'cost'` columns; omitting it treats every model as its
 *   default region). The caller supplies this because the effective region
 *   depends on per-project settings the pure helper cannot know.
 * @returns Negative if `a` sorts before `b`, positive if after, zero if equal.
 */
export function compareModels(
  a: AppModelDefinition,
  b: AppModelDefinition,
  column: ModelSortColumn,
  regionOf?: (model: AppModelDefinition) => ModelProcessingRegion,
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
      // Region-aware: a model flipped to a differently-priced region sorts by
      // the cost it actually bills at.
      primary = modelTotalCost(a, regionOf?.(a)) - modelTotalCost(b, regionOf?.(b))
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
    case 'region': {
      // US-processed (platform-default) models sort first ascending; other
      // regions follow alphabetically by region code.
      const ra = regionOf?.(a) ?? 'us'
      const rb = regionOf?.(b) ?? 'us'
      primary = ra === rb ? 0 : ra === 'us' ? -1 : rb === 'us' ? 1 : ra.localeCompare(rb)
      break
    }
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
 * @param regionOf - Resolves a model's effective processing region (used by
 *   the `'region'` and `'cost'` columns). See {@link compareModels}.
 * @returns A new, sorted array.
 */
export function sortModels(
  models: readonly AppModelDefinition[],
  column: ModelSortColumn,
  direction: SortDirection,
  regionOf?: (model: AppModelDefinition) => ModelProcessingRegion,
): AppModelDefinition[] {
  // Swapping the comparator arguments for `'desc'` fully reverses the order
  // (including the label tiebreak) without relying on Array#sort stability.
  return [...models].sort((a, b) =>
    direction === 'desc'
      ? compareModels(b, a, column, regionOf)
      : compareModels(a, b, column, regionOf),
  )
}
