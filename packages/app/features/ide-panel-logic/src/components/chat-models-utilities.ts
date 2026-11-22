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
import { isDeprecated, PROVIDER_BRAND_COLORS } from '@molecule/app-ai-models'
import type { TranslateFunction } from '@molecule/app-i18n'

import type {
  FreeTierLockReason,
  ModelMode,
  PerModeModelSettings,
  ServerModeDefaults,
} from './chat-model-mode-utilities.js'
import {
  freeTierLockReason,
  freeTierUsableMode,
  parseModelModeCommand,
  resolveModeModel,
} from './chat-model-mode-utilities.js'

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
 * Mirrors the server's `priceMultiplierAt`, including its `daysOfWeekUtc` and
 * `excludedDatesUtc` (public holidays) handling and the rule that matters
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
    // A wrapping window belongs to the day it STARTED on, so its
    // post-midnight tail is matched against the previous UTC day.
    const startedYesterday = wraps && minute < w.endMinuteUtc
    if (w.daysOfWeekUtc && w.daysOfWeekUtc.length > 0) {
      const day = startedYesterday ? (at.getUTCDay() + 6) % 7 : at.getUTCDay()
      if (!w.daysOfWeekUtc.includes(day)) continue
    }
    if (peak.excludedDatesUtc && peak.excludedDatesUtc.length > 0) {
      const started = new Date(at.getTime() - (startedYesterday ? 86_400_000 : 0))
      if (peak.excludedDatesUtc.includes(started.toISOString().slice(0, 10))) continue
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

/**
 * The localized display name of a processing region (the
 * `ide.chat.model.region.<code>` keys), through the CALLER's translate
 * function. {@link ModelProcessingRegion} is deliberately an OPEN union (the
 * catalog can add a region without a contract change), so this is a switch
 * over the regions the bond has keys for plus a fallback: a code with no key
 * renders as its uppercase code, the same text the chat panel used to show as
 * the untranslated `defaultValue` — a brand-new region degrades to `EU`, not
 * to a missing-translation guess.
 *
 * @param t - The caller's translate function (React passes `useTranslation()`'s `t`).
 * @param region - The region code (e.g. `'us'`, `'cn'`).
 * @returns The localized region label.
 */
export function modelRegionLabel(t: TranslateFunction, region: ModelProcessingRegion): string {
  switch (region) {
    case 'us':
      return t('ide.chat.model.region.us', undefined, { defaultValue: 'US' })
    case 'cn':
      return t('ide.chat.model.region.cn', undefined, { defaultValue: 'CN' })
    default:
      // No key for this code in the bond yet — show the raw code, as before.
      return region.toUpperCase()
  }
}

/**
 * Every region the picker can offer: the flag's country code (resolved via the
 * bonded `@molecule/app-country-flags` set). The region's display NAME comes from
 * {@link modelRegionLabel} (the literal `ide.chat.model.region.<code>` keys).
 * Adding a region here (plus a server-side provider registration) is ALL the UI
 * needs — the region control's menu lists whatever {@link availableModelRegions}
 * returns.
 */
export const MODEL_REGION_FLAGS: Record<string, string> = {
  us: 'US',
  cn: 'CN',
}

/**
 * Regions a model can be processed in, first entry = its default — straight
 * from the catalog (`AppModelDefinition.regions`; the server enforces the same
 * list). A single-entry list is a pinned model (fixed, non-interactive flag);
 * omission means the US-only platform default. The control/menu UI renders
 * whatever this returns, so new regions only need catalog data + a
 * `MODEL_REGION_FLAGS` entry.
 * @param model - The model to resolve regions for.
 * @returns Available region codes, default first.
 */
export function availableModelRegions(model: AppModelDefinition): ModelProcessingRegion[] {
  return model.regions ?? ['us']
}

/**
 * The replacement chosen when a saved model has left the catalog, plus the
 * notice the chat panel shows the user about it.
 */
export interface RemovedModelFallback {
  /** The model id to fall back to, or `null` when no replacement exists. */
  fallback: string | null
  /** The already-localized notice to surface for the removal. */
  notice: string
}

/**
 * Decides what the removed-model effect does: which still-available model
 * replaces a model that left the catalog, and the notice it shows. Prefers a
 * still-available model from the SAME custom provider before a platform model,
 * so a BYO provider's renamed model keeps the user on their own endpoint
 * rather than bouncing them to a platform free model.
 *
 * @param removedId - The saved model id that is no longer in the catalog.
 * @param models - The available models from the catalog.
 * @param freeTierModel - The catalog's free-tier model id (may be empty).
 * @param t - The caller's translate function (React passes `useTranslation()`'s `t`).
 * @returns The fallback id (or `null`) and the localized notice to show.
 */
export function resolveRemovedModelFallback(
  removedId: string,
  models: readonly AppModelDefinition[],
  freeTierModel: string,
  t: TranslateFunction,
): RemovedModelFallback {
  const sameProviderPrefix = removedId.match(/^(custom\/[^/]+\/)/)?.[1]
  const sameProviderModel = sameProviderPrefix
    ? models.find((m) => m.id.startsWith(sameProviderPrefix))?.id
    : undefined
  const fallback = sameProviderModel || freeTierModel || models[0]?.id
  if (!fallback) {
    return {
      fallback: null,
      notice: t(
        'ide.chat.modelRemovedNoFallback',
        { removed: removedId },
        {
          defaultValue:
            'Your selected model "{{removed}}" is no longer available, and no replacement is bonded on the server. Ask your admin to wire an AI provider.',
        },
      ),
    }
  }
  return {
    fallback,
    notice: t(
      'ide.chat.modelRemoved',
      { removed: removedId, fallback },
      {
        defaultValue:
          'Your selected model "{{removed}}" is no longer available. Switched to "{{fallback}}". Type /model to pick another.',
      },
    ),
  }
}

/**
 * Filters the catalog for the `/model` picker's open query. For a mode-scoped
 * command the filter is the text after the flag; otherwise it is the text after
 * `/model `. Matches the model id or label case-insensitively; an empty query
 * returns every model unchanged.
 *
 * @param text - The picker's raw input text.
 * @param models - The available models from the catalog.
 * @returns The models matching the query (the whole list when the query is empty).
 */
export function filterModelsByPickerQuery(
  text: string,
  models: AppModelDefinition[],
): AppModelDefinition[] {
  const modeMatch = parseModelModeCommand(text)
  const q = (modeMatch ? modeMatch.query : (text.match(/^\/model\s+(.*)/i)?.[1] ?? ''))
    .trim()
    .toLowerCase()
  if (!q) return models
  return models.filter((m) => m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q))
}

/**
 * Resolves a `/model <query>` argument to the closest catalog model: an exact
 * id match first, then a case-insensitive id substring, then a label substring.
 *
 * @param query - The raw typed query (the text after `/model`).
 * @param models - The available models from the catalog.
 * @returns The resolved model, or `undefined` when nothing matches.
 */
export function resolveModelQuery(
  query: string,
  models: readonly AppModelDefinition[],
): AppModelDefinition | undefined {
  const q = query.toLowerCase()
  return (
    models.find((m) => m.id === q) ??
    models.find((m) => m.id.toLowerCase().includes(q)) ??
    models.find((m) => m.label.toLowerCase().includes(q))
  )
}

/**
 * The row that gets the "current" pill in the `/model` picker — the model the
 * selected picker mode actually uses (its per-mode value with the mode's REAL
 * fallback chain), not unconditionally the legacy `chatModel`. The generic
 * (no-mode) picker edits the default slot, so its pill is the SAVED default
 * only — a seeded catalog default is not a choice and must not masquerade as
 * one.
 *
 * @param picker - The open picker (`null` when closed).
 * @param effectiveModelForMode - Resolves the model a conversation mode uses.
 * @param settings - The project's persisted model settings.
 * @param serverDefaults - Server-sent per-mode defaults (`GET /ai/models`).
 * @returns The current model id, or `undefined` when none applies.
 */
export function pickerCurrentModelId(
  picker: { mode?: ModelMode } | null,
  effectiveModelForMode: (mode: 'plan' | 'execute') => string,
  settings: PerModeModelSettings,
  serverDefaults: ServerModeDefaults,
): string | undefined {
  if (!picker) return undefined
  if (picker.mode === 'plan' || picker.mode === 'execute') {
    return effectiveModelForMode(picker.mode)
  }
  if (picker.mode) {
    return resolveModeModel(settings, picker.mode) ?? serverDefaults?.[picker.mode]
  }
  return settings.chatModel || undefined
}

/** One capability badge shown on a model picker row. */
export interface ModelPickerBadge {
  /** The badge text (an untranslated capability name today). */
  label: string
  /** Background tint. */
  bg: string
  /** Text tint. */
  fg: string
}

/** The region pill's pre-rendered data (rendered only when {@link show}). */
export interface ModelPickerRegionPill {
  /** Whether the row shows a region pill at all. */
  show: boolean
  /** The regions the model can be processed in, default first. */
  options: ModelProcessingRegion[]
  /** The model's effective region. */
  region: ModelProcessingRegion
  /** Whether the region is user-changeable (more than one option). */
  interactive: boolean
  /** The localized region name. */
  label: string
  /** The localized pill/menu hint. */
  hint: string
}

/**
 * Everything a `/model` picker row computes before its JSX: its capability
 * badges, the free-tier lock reason, the "free in <mode>" label, the relative
 * usage rate and its price colour, and the processing-region pill.
 */
export interface ModelPickerRowView {
  /** Capability badges in display order. */
  badges: ModelPickerBadge[]
  /** Why the row is locked for a free-tier user, or `null` when selectable. */
  lockReason: FreeTierLockReason | null
  /** Convenience boolean view of {@link lockReason}. */
  locked: boolean
  /** The mode a free-tier user can actually use this model in, if any. */
  usableMode: ModelMode | null
  /** The localized "free in <mode>" label. */
  freeInLabel: string
  /** Whether this is a bring-your-own-AI (custom provider) model. */
  isCustom: boolean
  /** Relative allowance usage rate (`×N`). */
  usageRate: number
  /** The peak multiplier in force right now. */
  peakNow: number
  /** The colour the usage-rate figure renders in. */
  priceColor: string
  /** The model's effective processing region. */
  modelRegion: ModelProcessingRegion
  /** The region pill's data (rendered only when {@link ModelPickerRegionPill.show}). */
  regionPill: ModelPickerRegionPill
  /** The provider brand accent colour. */
  accent: string
}

/** The inputs {@link modelPickerRowView} reads for one row. */
export interface ModelPickerRowInput {
  /** The catalog model the row renders. */
  model: AppModelDefinition
  /** Whether the app is in light theme (badge and price tints). */
  isLight: boolean
  /** Whether the current user is on the free/anon tier. */
  isFreeTier: boolean
  /** The picker's scoped mode, or undefined for the unscoped picker. */
  mode?: ModelMode
  /** The full available-model catalog. */
  models: readonly AppModelDefinition[]
  /** Server-sent per-mode defaults (`GET /ai/models`). */
  serverDefaults: ServerModeDefaults
  /** The catalog's free-tier model id. */
  freeTierModel: string
  /** The row model's effective processing region. */
  modelRegion: ModelProcessingRegion
  /** The caller's translate function. */
  t: TranslateFunction
}

/**
 * Computes everything a `/model` picker row needs before rendering its JSX:
 * capability badges, the free-tier lock reason, the "free in <mode>" label, the
 * relative usage rate and price colour, and the processing-region pill.
 *
 * @param input - The row's model plus the render-time context (theme, tier,
 *   scoped mode, catalog, server defaults, effective region, translate function).
 * @returns The pre-computed {@link ModelPickerRowView}.
 */
export function modelPickerRowView(input: ModelPickerRowInput): ModelPickerRowView {
  const {
    model,
    isLight,
    isFreeTier,
    mode,
    models,
    serverDefaults,
    freeTierModel,
    modelRegion,
    t,
  } = input
  const badges: ModelPickerBadge[] = []
  if (model.supportsVision)
    badges.push({
      label: 'vision',
      bg: isLight ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.18)',
      fg: isLight ? 'rgb(37,99,235)' : 'rgb(96,165,250)',
    })
  if (model.supportsThinking)
    badges.push({
      label: 'thinking',
      bg: isLight ? 'rgba(168,85,247,0.12)' : 'rgba(168,85,247,0.18)',
      fg: isLight ? 'rgb(126,34,206)' : 'rgb(192,132,252)',
    })
  if (model.webSearchToolType)
    badges.push({
      label: 'web search',
      bg: isLight ? 'rgba(22,163,74,0.12)' : 'rgba(34,197,94,0.18)',
      fg: isLight ? 'rgb(22,163,74)' : 'rgb(74,222,128)',
    })
  if (model.supportsPromptCaching)
    badges.push({
      label: 'caching',
      bg: isLight ? 'rgba(202,138,4,0.12)' : 'rgba(234,179,8,0.18)',
      fg: isLight ? 'rgb(161,98,7)' : 'rgb(250,204,21)',
    })
  if (model.fastPricing)
    badges.push({
      label: 'fast mode',
      bg: isLight ? 'rgba(234,88,12,0.12)' : 'rgba(249,115,22,0.18)',
      fg: isLight ? 'rgb(194,65,12)' : 'rgb(251,146,60)',
    })
  if (isDeprecated(model))
    badges.push({
      label: `deprecated ${model.deprecatedAt}`,
      bg: isLight ? 'rgba(217,119,6,0.12)' : 'rgba(217,119,6,0.18)',
      fg: isLight ? 'rgb(180,83,9)' : 'rgb(251,191,36)',
    })
  // Region flag pill: shown when the model has a region CHOICE, or runs
  // outside the default US region (a fixed flag).
  const modelRegionOptions = availableModelRegions(model)
  const showRegionPill = modelRegionOptions.length > 1 || modelRegion !== 'us'
  const accent = PROVIDER_BRAND_COLORS[model.provider] ?? '#888'
  // Free tier is clamped per mode to what the SERVER allows (the catalog's
  // freeTier-flagged model + the server-sent default for the scoped mode —
  // never a hardcoded id); the unscoped picker keeps the single free-tier
  // model. Custom (bring-your-own AI) models are never locked — the user pays
  // their own provider directly. The lock REASON matters: 'paid' gets the Pro
  // pill + upgrade card, while 'mode' (a model the free tier uses in a
  // DIFFERENT mode, e.g. the execute clamp shown in the plan scope) must never
  // claim "Pro".
  const lockReason: FreeTierLockReason | null = mode
    ? freeTierLockReason(model.id, mode, isFreeTier, models, serverDefaults)
    : isFreeTier && model.id !== freeTierModel && model.provider !== 'custom'
      ? 'paid'
      : null
  const locked = lockReason !== null
  // For 'mode' locks: which mode the free tier actually uses this model in
  // ('commit' stands for both aux jobs).
  const usableMode: ModelMode | null =
    lockReason === 'mode' ? freeTierUsableMode(model.id, models, serverDefaults) : null
  const freeInLabel =
    usableMode === 'plan'
      ? t('ide.chat.freeInPlan', undefined, { defaultValue: 'free in plan' })
      : usableMode === 'execute'
        ? t('ide.chat.freeInExecute', undefined, {
            defaultValue: 'free in execute',
          })
        : t('ide.chat.freeInCommit', undefined, {
            defaultValue: 'free in commit',
          })
  // Relative usage rate vs the cheapest available model — the unitless "how
  // fast does this eat my allowance" figure shown INSTEAD of currency. Green
  // ≤×5, yellow ≤×25, red above. Custom (bring-your-own AI) models have
  // all-zero list prices and consume no allowance, so they show a neutral
  // "your key" instead of a misleading ×1.
  const isCustom = model.provider === 'custom'
  // Priced at the model's EFFECTIVE region so flipping a region immediately
  // re-rates the row (e.g. DeepSeek V4 Pro: ×3 native-CN vs ×9 US-rehosted).
  const usageRate = modelUsageRate(model, models, modelRegion)
  // Whether the rate above is currently inflated by a peak window.
  const peakNow = modelPeakMultiplier(model, modelRegion)
  const priceColor =
    usageRate <= 5
      ? isLight
        ? 'rgb(22,163,74)'
        : 'rgb(74,222,128)'
      : usageRate <= 25
        ? isLight
          ? 'rgb(161,98,7)'
          : 'rgb(250,204,21)'
        : isLight
          ? 'rgb(220,38,38)'
          : 'rgb(248,113,113)'
  const interactive = modelRegionOptions.length > 1
  // Only compute the pill's labels when it actually renders, so the prompt's
  // `t()` calls happen exactly when the JSX would have made them.
  const regionLabel = showRegionPill ? modelRegionLabel(t, modelRegion) : ''
  const hint = !showRegionPill
    ? ''
    : interactive
      ? t(
          'ide.chat.model.regionHint',
          { region: regionLabel },
          {
            defaultValue: 'Processed in: {{region}} — click to change',
          },
        )
      : t(
          'ide.chat.model.regionOnlyHint',
          { region: regionLabel },
          { defaultValue: 'Only hosted in: {{region}}' },
        )
  return {
    badges,
    lockReason,
    locked,
    usableMode,
    freeInLabel,
    isCustom,
    usageRate,
    peakNow,
    priceColor,
    modelRegion,
    regionPill: {
      show: showRegionPill,
      options: modelRegionOptions,
      region: modelRegion,
      interactive,
      label: regionLabel,
      hint,
    },
    accent,
  }
}
