/**
 * Lookups over the AI model catalog.
 *
 * @module
 */

import { MODELS } from './models.js'
import type { AIProviderID, ModelDefinition } from './types.js'

/**
 * Whether a model may be offered for selection: not `disabled` (retired
 * upstream) and not `supersededBy` a newer generation of its own family. Both
 * kinds stay in the catalog for pricing — this predicate is the single place
 * that decides *exposure*, so every listing/validation surface agrees.
 *
 * @param model - The model definition (or the two flags from one).
 * @returns True when the model may be listed and chosen.
 */
export function isSelectableModel(
  model: Pick<ModelDefinition, 'disabled' | 'supersededBy'>,
): boolean {
  return !model.disabled && !model.supersededBy
}

/**
 * Resolve a model id FORWARD to the selectable model that replaces it, following
 * the {@link ModelDefinition.supersededBy} chain (a saved `qwen3.7-max` →
 * `qwen3.8-max`). Lets a persisted selection keep the user's intent — the same
 * tier from the same provider — instead of falling back to the platform default
 * once the older generation stops being offered.
 *
 * @param id - The persisted model id.
 * @returns The selectable successor's id, the id itself when it is already
 *   selectable, or `undefined` for an unknown or `disabled` model (nothing to
 *   forward to).
 */
export function resolveSelectableModelId(id: string): string | undefined {
  let model = getModel(id)
  // Bounded by the catalog size: a supersession cycle would otherwise spin here,
  // and the invariant that forbids one is a test, not a runtime guarantee.
  for (let hops = 0; model && !isSelectableModel(model) && hops <= MODELS.length; hops++) {
    if (!model.supersededBy) return undefined // disabled — no successor declared
    model = getModel(model.supersededBy)
  }
  return model && isSelectableModel(model) ? model.id : undefined
}

/**
 * Set of *selectable* model IDs for fast validation.
 *
 * Excludes `disabled` models so a retired model (e.g. `grok-code-fast-1`) can
 * never be chosen for a new chat, and `supersededBy` models so an older
 * generation of a family (e.g. `qwen3.7-max` next to `qwen3.8-max`) is never
 * offered — while {@link getModel} still resolves both for historical pricing.
 */
export const MODEL_IDS: ReadonlySet<string> = new Set(
  MODELS.filter(isSelectableModel).map((m) => m.id),
)

/**
 * Look up a model definition by ID.
 *
 * Returns `disabled` and `supersededBy` models too: a saved selection or a
 * historical usage row may reference a since-retired or since-superseded model,
 * and it must stay priceable. Use {@link MODEL_IDS} / {@link getAvailableModels}
 * (or {@link isSelectableModel}) to decide what is *selectable*.
 *
 * @param id - The API model ID.
 * @returns The model definition, or `undefined` if not found.
 */
export function getModel(id: string): ModelDefinition | undefined {
  return MODELS.find((m) => m.id === id)
}

/**
 * Get all models for a specific provider.
 *
 * @param provider - The provider ID.
 * @returns Array of model definitions for that provider.
 */
export function getModelsByProvider(provider: AIProviderID): readonly ModelDefinition[] {
  return MODELS.filter((m) => m.provider === provider)
}

/**
 * Get models that are currently usable — filtered to only providers that are available.
 *
 * The caller passes in which provider IDs are active (i.e. have a bond wired).
 * Models that are not {@link isSelectableModel} — `disabled` or superseded by a
 * newer generation — are excluded; they are never offered for selection.
 *
 * @param availableProviders - Set or array of provider IDs that have active bonds.
 * @returns Selectable models whose provider is in the available set.
 */
export function getAvailableModels(
  availableProviders: ReadonlySet<AIProviderID> | readonly AIProviderID[],
): readonly ModelDefinition[] {
  const providerSet =
    availableProviders instanceof Set ? availableProviders : new Set(availableProviders)
  return MODELS.filter((m) => providerSet.has(m.provider) && isSelectableModel(m))
}

/**
 * Whether a model's staged {@link ModelDefinition.scheduledPricing} change has
 * taken effect at a given instant.
 *
 * @param modelDef - The model definition.
 * @param at - The instant to evaluate.
 * @returns `true` once `at` is at or past the scheduled `effectiveFrom`.
 */
function scheduledPricingApplies(modelDef: ModelDefinition, at: Date): boolean {
  const scheduled = modelDef.scheduledPricing
  if (!scheduled) return false
  const effectiveFrom = Date.parse(scheduled.effectiveFrom)
  // An unparseable date must never silently reprice a model. Ignoring the
  // staged entry keeps the current, verified rates in force.
  if (Number.isNaN(effectiveFrom)) return false
  return at.getTime() >= effectiveFrom
}

/**
 * A model's BASE token rates in effect at a given instant — the staged
 * {@link ModelDefinition.scheduledPricing} rates once their `effectiveFrom` has
 * passed, else the base fields.
 *
 * These are the native provider's rates. A `regionPricing` override is a
 * different host's rate card and is resolved separately by
 * {@link modelRegionRates}.
 *
 * @param modelDef - The model definition.
 * @param at - The instant to price at (defaults to now).
 * @returns The base rates in effect at that instant.
 */
export function effectiveBaseRates(
  modelDef: ModelDefinition,
  at: Date = new Date(),
): ModelTokenRates {
  const scheduled = modelDef.scheduledPricing
  if (scheduled && scheduledPricingApplies(modelDef, at)) {
    return {
      inputPricePerMTok: scheduled.inputPricePerMTok,
      outputPricePerMTok: scheduled.outputPricePerMTok,
      cacheReadPricePerMTok: scheduled.cacheReadPricePerMTok,
      cacheWritePricePerMTok: scheduled.cacheWritePricePerMTok,
    }
  }
  return {
    inputPricePerMTok: modelDef.inputPricePerMTok,
    outputPricePerMTok: modelDef.outputPricePerMTok,
    cacheReadPricePerMTok: modelDef.cacheReadPricePerMTok,
    cacheWritePricePerMTok: modelDef.cacheWritePricePerMTok,
  }
}

/**
 * A model's peak-hour pricing in effect at a given instant: the staged
 * {@link ModelDefinition.scheduledPricing} `peakPricing` once its
 * `effectiveFrom` has passed (when that entry declares one — an omitted one
 * leaves the existing windows in force), else the model's own `peakPricing`.
 *
 * @param modelDef - The model definition.
 * @param at - The instant to evaluate (defaults to now).
 * @returns The peak-pricing config in effect, or `undefined` when none is.
 */
export function effectivePeakPricing(
  modelDef: ModelDefinition,
  at: Date = new Date(),
): ModelDefinition['peakPricing'] {
  const scheduled = modelDef.scheduledPricing
  if (scheduled?.peakPricing && scheduledPricingApplies(modelDef, at)) {
    return scheduled.peakPricing
  }
  return modelDef.peakPricing
}

/**
 * A model projected onto the pricing in effect at a given instant: the staged
 * {@link ModelDefinition.scheduledPricing} rates folded into the base fields
 * (and its peak windows into `peakPricing`) once effective, with the staged
 * entry stripped.
 *
 * This is what the `GET /ai/models` handler serves, so a client renders the
 * rates that are actually billing right now without needing to resolve a
 * schedule against its own clock — the server's clock is the only one that
 * decides when a price change lands.
 *
 * @param modelDef - The model definition.
 * @param at - The instant to project at (defaults to now).
 * @returns The model with effective pricing and no `scheduledPricing`.
 */
export function withEffectivePricing(
  modelDef: ModelDefinition,
  at: Date = new Date(),
): ModelDefinition {
  if (!modelDef.scheduledPricing) return modelDef
  const { scheduledPricing: _scheduledPricing, ...rest } = modelDef
  const peakPricing = effectivePeakPricing(modelDef, at)
  return {
    ...rest,
    ...effectiveBaseRates(modelDef, at),
    ...(peakPricing ? { peakPricing } : {}),
  }
}

/**
 * The price multiplier in effect for a model at a given instant, in a region.
 *
 * Consults the model's {@link ModelDefinition.peakPricing} windows (UTC,
 * half-open, may wrap midnight). Metering MUST call this with each request's
 * own timestamp so peak-hour usage bills at the provider's real rate — pricing
 * everything at the flat rate silently under-meters peak traffic.
 *
 * Peak windows belong to the NATIVE provider, so they apply only where the base
 * rates do. A region with a {@link ModelDefinition.regionPricing} override is a
 * different host billing its own complete rate card, including whether it has
 * time-of-day pricing at all — and re-hosts generally do not. Applying the
 * native provider's surcharge on top of a re-host's flat rates would over-bill
 * every turn in its windows (DeepSeek's 2× Beijing-hours pricing charged
 * against DeepInfra, which has no peak pricing).
 *
 * @param modelDef - The model definition (or undefined).
 * @param at - The instant the request was made.
 * @param region - The user's per-model region choice, if any (omitted → the
 *   model's default region).
 * @returns The multiplier (`1` outside peak windows, when none are declared, or
 *   in a region that prices off its own override).
 */
export function priceMultiplierAt(
  modelDef: ModelDefinition | undefined,
  at: Date,
  region?: string,
): number {
  if (!modelDef) return 1
  if (modelDef.regionPricing?.[effectiveModelRegion(modelDef, region)]) return 1
  const peak = effectivePeakPricing(modelDef, at)
  if (!peak || peak.windows.length === 0) return 1
  const minute = at.getUTCHours() * 60 + at.getUTCMinutes()
  for (const w of peak.windows) {
    const inWindow =
      w.startMinuteUtc <= w.endMinuteUtc
        ? minute >= w.startMinuteUtc && minute < w.endMinuteUtc
        : minute >= w.startMinuteUtc || minute < w.endMinuteUtc
    if (inWindow) return peak.multiplier
  }
  return 1
}

/**
 * Resolve a model's effective processing region: the requested region when the
 * model's {@link ModelDefinition.regions} list offers it, else the model's
 * DEFAULT region (the first listed; `'us'` when the catalog omits regions,
 * which also covers unknown model ids). A single-entry `regions` list pins the
 * model regardless of the request (e.g. a model with no US re-host).
 *
 * @param modelDef - The model definition (or undefined for unknown ids).
 * @param requested - The user's per-model region choice, if any.
 * @returns The effective region code.
 */
export function effectiveModelRegion(
  modelDef: ModelDefinition | undefined,
  requested?: string,
): string {
  const regions = modelDef?.regions ?? ['us']
  return requested && regions.includes(requested) ? requested : regions[0]
}

/** The four per-MTok token rates a turn bills at (USD). */
export interface ModelTokenRates {
  /** Input price per million uncached tokens in USD. */
  inputPricePerMTok: number
  /** Output price per million tokens in USD. */
  outputPricePerMTok: number
  /** Prompt-cache read price per million tokens in USD. */
  cacheReadPricePerMTok: number
  /** Prompt-cache write price per million tokens in USD. */
  cacheWritePricePerMTok: number
}

/**
 * The token rates for a model in a given processing region: the model's
 * {@link ModelDefinition.regionPricing} override for the region when one
 * exists, else the base rates in effect at `at` (the native provider's list
 * prices, including any staged {@link ModelDefinition.scheduledPricing} change
 * that has landed). Omitted cache fields in an override fall back to the
 * override's input price (hosts with no cache discount / no write premium). The
 * region is resolved via {@link effectiveModelRegion}, so callers may pass the
 * raw user choice.
 *
 * `at` defaults to NOW rather than being required, so an existing caller cannot
 * keep billing a superseded rate by omitting it — metering should still pass
 * each request's own timestamp, the same way it must for
 * {@link priceMultiplierAt}.
 *
 * @param modelDef - The model definition.
 * @param requested - The user's per-model region choice, if any.
 * @param at - The instant to price at (defaults to now).
 * @returns The region-effective rates.
 */
export function modelRegionRates(
  modelDef: ModelDefinition,
  requested?: string,
  at: Date = new Date(),
): ModelTokenRates {
  const region = effectiveModelRegion(modelDef, requested)
  const override = modelDef.regionPricing?.[region]
  if (!override) {
    return effectiveBaseRates(modelDef, at)
  }
  return {
    inputPricePerMTok: override.inputPricePerMTok,
    outputPricePerMTok: override.outputPricePerMTok,
    cacheReadPricePerMTok: override.cacheReadPricePerMTok ?? override.inputPricePerMTok,
    cacheWritePricePerMTok: override.cacheWritePricePerMTok ?? override.inputPricePerMTok,
  }
}
