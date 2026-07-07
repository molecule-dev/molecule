/**
 * Lookups over the AI model catalog.
 *
 * @module
 */

import { MODELS } from './models.js'
import type { AIProviderID, ModelDefinition } from './types.js'

/**
 * Set of *selectable* model IDs for fast validation.
 *
 * Excludes `disabled` models so a retired model (e.g. `grok-code-fast-1`) can
 * never be chosen for a new chat, while {@link getModel} still resolves it for
 * historical pricing.
 */
export const MODEL_IDS: ReadonlySet<string> = new Set(
  MODELS.filter((m) => !m.disabled).map((m) => m.id),
)

/**
 * Look up a model definition by ID.
 *
 * Returns `disabled` models too: a saved selection or a historical usage row
 * may reference a since-retired model, and it must stay priceable. Use
 * {@link MODEL_IDS} / {@link getAvailableModels} (which exclude disabled
 * models) to decide what is *selectable*.
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
 * `disabled` models are excluded — they are never offered for selection.
 *
 * @param availableProviders - Set or array of provider IDs that have active bonds.
 * @returns Non-disabled models whose provider is in the available set.
 */
export function getAvailableModels(
  availableProviders: ReadonlySet<AIProviderID> | readonly AIProviderID[],
): readonly ModelDefinition[] {
  const providerSet =
    availableProviders instanceof Set ? availableProviders : new Set(availableProviders)
  return MODELS.filter((m) => providerSet.has(m.provider) && !m.disabled)
}

/**
 * The price multiplier in effect for a model at a given instant.
 *
 * Consults the model's {@link ModelDefinition.peakPricing} windows (UTC,
 * half-open, may wrap midnight). Metering MUST call this with each request's
 * own timestamp so peak-hour usage bills at the provider's real rate — pricing
 * everything at the flat rate silently under-meters peak traffic.
 *
 * @param modelDef - The model definition (or undefined).
 * @param at - The instant the request was made.
 * @returns The multiplier (`1` outside peak windows or when none are declared).
 */
export function priceMultiplierAt(modelDef: ModelDefinition | undefined, at: Date): number {
  const peak = modelDef?.peakPricing
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
