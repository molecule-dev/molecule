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
 * The peak-hour multiplier in force for a model at an instant, in a region.
 *
 * Mirrors the server's `priceMultiplierAt`, including its `daysOfWeekUtc`
 * handling and the rule that matters
 * most: peak belongs to the NATIVE provider, so a region with a `regionPricing`
 * override — a different host, billing its own flat card — never takes it.
 * Showing a 2× on a re-host the user is actually routed to would be a lie in
 * the expensive direction.
 *
 * @param model - The model metadata.
 * @param region - The user's per-model region choice, if any.
 * @param at - The instant to evaluate (defaults to now).
 * @returns The multiplier, or `1` when no peak window applies.
 */
export function modelPeakMultiplier(
  model: AppModelDefinition,
  region?: string,
  at: Date = new Date(),
): number {
  if (model.regionPricing?.[effectiveModelRegion(model, region)]) return 1
  const peak = model.peakPricing
  if (!peak || peak.windows.length === 0) return 1
  const minute = at.getUTCHours() * 60 + at.getUTCMinutes()
  for (const w of peak.windows) {
    const wraps = w.startMinuteUtc > w.endMinuteUtc
    const inWindow = wraps
      ? minute >= w.startMinuteUtc || minute < w.endMinuteUtc
      : minute >= w.startMinuteUtc && minute < w.endMinuteUtc
    if (!inWindow) continue
    if (w.daysOfWeekUtc && w.daysOfWeekUtc.length > 0) {
      // A wrapping window belongs to the day it STARTED on, so its
      // post-midnight tail is matched against the previous UTC day.
      const day = wraps && minute < w.endMinuteUtc ? (at.getUTCDay() + 6) % 7 : at.getUTCDay()
      if (!w.daysOfWeekUtc.includes(day)) continue
    }
    return peak.multiplier
  }
  return 1
}

/**
 * Whether a model can EVER cost more at some hours than others, in a region.
 *
 * Distinct from {@link modelPeakMultiplier}, which answers "right now". The
 * picker needs both: one to price the current moment, one to decide whether the
 * model deserves a "costs more at some hours" explanation at all — a model in
 * its off-peak hours still surprises the user later if nothing says so.
 *
 * @param model - The model metadata.
 * @param region - The user's per-model region choice, if any.
 * @returns True when the model has peak windows that apply in this region.
 */
export function modelHasPeakPricing(model: AppModelDefinition, region?: string): boolean {
  if (model.regionPricing?.[effectiveModelRegion(model, region)]) return false
  return (model.peakPricing?.windows.length ?? 0) > 0 && model.peakPricing!.multiplier !== 1
}

/**
 * A window's `daysOfWeekUtc` as a localized weekday label, for display.
 *
 * The days are UTC but the times are shown in the user's clock, and the two can
 * disagree — a Monday 01:00 UTC window starts on Sunday evening in UTC-8. So
 * each UTC day is resolved through the window's own START instant and read back
 * in local time, which is the same day the `HH:MM` beside it belongs to.
 * Contiguous runs collapse to a range (`Mon–Fri`), including runs that wrap the
 * week; anything else lists the days.
 *
 * @param window - The peak window.
 * @returns The localized weekday label, empty when the window applies every day.
 */
function peakWindowDayLabel(window: { startMinuteUtc: number; daysOfWeekUtc?: number[] }): string {
  const days = window.daysOfWeekUtc
  if (!days || days.length === 0 || days.length >= 7) return ''
  // 2026-08-30 is a Sunday in UTC, so `+ d` lands on UTC weekday `d`.
  const byLocalDay = new Map<number, string>()
  for (const d of days) {
    const at = new Date(Date.UTC(2026, 7, 30 + d, 0, window.startMinuteUtc))
    byLocalDay.set(at.getDay(), at.toLocaleDateString(undefined, { weekday: 'short' }))
  }
  const present = [...byLocalDay.keys()].sort((a, b) => a - b)
  if (present.length === 1) return byLocalDay.get(present[0])!
  const start = present.find((d) => !byLocalDay.has((d + 6) % 7))
  if (start !== undefined) {
    let end = start
    let length = 1
    while (byLocalDay.has((end + 1) % 7) && length < present.length) {
      end = (end + 1) % 7
      length += 1
    }
    if (length === present.length) return `${byLocalDay.get(start)!}–${byLocalDay.get(end)!}`
  }
  return present.map((d) => byLocalDay.get(d)!).join(', ')
}

/**
 * The peak windows as local-time `HH:MM–HH:MM` ranges, for display, prefixed
 * with the weekdays they apply on when they do not apply every day.
 *
 * Local, not UTC: a user reasons about "is it expensive right now" in their own
 * clock, and the windows are only actionable if they can be compared to it. A
 * weekday-qualified window that renders as bare hours overstates the cost for
 * two days a week — the provider is not charging peak on a Saturday.
 *
 * @param model - The model metadata.
 * @returns Formatted local ranges, empty when the model has no peak windows.
 */
export function modelPeakWindowLabels(model: AppModelDefinition): string[] {
  const windows = model.peakPricing?.windows ?? []
  const fmt = (minuteUtc: number): string => {
    const d = new Date()
    d.setUTCHours(Math.floor(minuteUtc / 60), minuteUtc % 60, 0, 0)
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
  return windows.map((w) => {
    const hours = `${fmt(w.startMinuteUtc)}–${fmt(w.endMinuteUtc)}`
    const days = peakWindowDayLabel(w)
    return days ? `${days} ${hours}` : hours
  })
}

/**
 * The token mix a real agentic turn bills at, used to weight the cost figure.
 *
 * Agentic conversations re-send a growing prefix every turn, so prompt-cache
 * HITS dominate: measured traffic runs ~94% cache reads (deepseek, 2026-08-01).
 * Weighting matters more than the exact numbers — what breaks is ignoring cache
 * reads entirely, not being a few points off the ratio.
 */
const AGENTIC_TOKEN_MIX = { cacheRead: 47_000, input: 3_000, output: 800 } as const

/**
 * What a representative agentic turn costs on a model, in USD — the single
 * "cost" figure, at the rates of the model's effective region (`regionPricing`
 * override when the region has one, else the base rates).
 *
 * This weighted `AGENTIC_TOKEN_MIX` replaced a plain `input + output` sum on
 * 2026-08-14. That sum ignored cache reads, which is the term that actually
 * dominates the bill, and the error was not small: it showed Claude Haiku at
 * ×23 the cheapest model when the real figure is ×10, and gemini-3.7-flash at
 * ×35 against a true ×15 — systematically scaring users off cache-friendly
 * models while making a couple of others look cheaper than they bill. The sum
 * was a fine proxy while every provider's cache read was a fixed fraction of
 * input; it stopped being one once hosts started pricing cache reads
 * independently (DeepSeek's absolute cache-hit rates, DeepInfra's 0.2x).
 *
 * Not currency: callers surface this only as a RELATIVE multiplier
 * ({@link modelUsageRate}), never as a price.
 *
 * @param model - The model metadata.
 * @param region - The user's per-model region choice, if any (omitted → the
 *   model's default region).
 * @returns The blended cost of one representative turn in USD.
 */
export function modelTotalCost(model: AppModelDefinition, region?: string): number {
  const override = model.regionPricing?.[effectiveModelRegion(model, region)]
  const input = override?.inputPricePerMTok ?? model.inputPricePerMTok
  const output = override?.outputPricePerMTok ?? model.outputPricePerMTok
  // An override with no cache fields bills cache reads at its input rate — the
  // same fallback `modelRegionRates` applies server-side for metering.
  const cacheRead = override
    ? (override.cacheReadPricePerMTok ?? override.inputPricePerMTok)
    : model.cacheReadPricePerMTok
  return (
    (AGENTIC_TOKEN_MIX.cacheRead * cacheRead +
      AGENTIC_TOKEN_MIX.input * input +
      AGENTIC_TOKEN_MIX.output * output) /
    1_000_000
  )
}

/**
 * Relative usage rate: how much faster this model consumes the user's AI
 * allowance than the cheapest available model (a unitless `×N` multiplier,
 * `1` for the cheapest). Derived from {@link modelTotalCost}, a blended agentic
 * turn. This is the ONLY per-model "cost" figure user-facing surfaces show — AI
 * usage is never presented as currency.
 *
 * The base is every model's DEFAULT-region cost (stable regardless of the
 * user's per-model region choices); the rated model itself is priced at the
 * given region so the figure tracks what a region switch actually changes.
 *
 * PEAK PRICING IS INCLUDED, at `at`. A model inside a provider's peak window
 * genuinely drains the allowance at its multiplier, so the figure has to move
 * with it — a single all-day number is wrong twice a day. Only the RATED model
 * takes its multiplier: the base stays each model's off-peak default-region
 * cost, so the anchor does not wobble as unrelated models enter their windows.
 * Pair it with {@link modelHasPeakPricing} / {@link modelPeakWindowLabels} so a
 * changing number reads as explained rather than erratic.
 *
 * @param model - The model to rate.
 * @param models - The full available-model list (supplies the cheapest base).
 * @param region - The rated model's region choice, if any (omitted → its
 *   default region).
 * @param at - The instant to price at (defaults to now).
 * @returns The multiplier, rounded to 1 decimal below 10 and whole above.
 */
export function modelUsageRate(
  model: AppModelDefinition,
  models: readonly AppModelDefinition[],
  region?: string,
  at: Date = new Date(),
): number {
  const costs = models.map((m) => modelTotalCost(m)).filter((c) => c > 0)
  const base = costs.length > 0 ? Math.min(...costs) : 0
  if (!Number.isFinite(base) || base <= 0) return 1
  const rate = (modelTotalCost(model, region) * modelPeakMultiplier(model, region, at)) / base
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
