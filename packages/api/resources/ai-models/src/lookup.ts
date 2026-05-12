/**
 * Lookups over the AI model catalog.
 *
 * @module
 */

import { MODELS } from './models.js'
import type { AIProviderID, ModelDefinition } from './types.js'

/** Set of valid model IDs for fast validation. */
export const MODEL_IDS: ReadonlySet<string> = new Set(MODELS.map((m) => m.id))

/**
 * Look up a model definition by ID.
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
 *
 * @param availableProviders - Set or array of provider IDs that have active bonds.
 * @returns Models whose provider is in the available set.
 */
export function getAvailableModels(
  availableProviders: ReadonlySet<AIProviderID> | readonly AIProviderID[],
): readonly ModelDefinition[] {
  const providerSet =
    availableProviders instanceof Set ? availableProviders : new Set(availableProviders)
  return MODELS.filter((m) => providerSet.has(m.provider))
}
