/**
 * Framework-agnostic loader for the AI model catalog.
 *
 * Fetches `GET /ai/models` via an injected HttpClient and returns the list of
 * available models. Caller (e.g. a React hook) is responsible for caching.
 *
 * @module
 */

import type { HttpClient } from '@molecule/app-http'

import type { AppModelDefinition, ListAIModelsResponse } from './types.js'

/**
 * Fetches the AI model catalog from the API and returns the models array.
 *
 * @param http - HTTP client bonded by the host app.
 * @param path - Endpoint path, defaults to `'/ai/models'` (the http client supplies the base URL).
 * @returns The list of models available to the current session.
 */
export async function loadAIModels(
  http: HttpClient,
  path = '/ai/models',
): Promise<AppModelDefinition[]> {
  const response = await http.get<ListAIModelsResponse>(path)
  return response.data.models
}

/**
 * Returns the free-tier model from a list, or `undefined` if none is marked.
 *
 * @param models - Loaded model catalog.
 * @returns The single model with `freeTier: true`, or `undefined`.
 */
export function pickFreeTierModel(
  models: readonly AppModelDefinition[],
): AppModelDefinition | undefined {
  return models.find((m) => m.freeTier)
}

/**
 * Returns `true` when the model is deprecated as of `now`. A model is deprecated
 * if `deprecatedAt` is set and lexicographically `<=` the `now` date (YYYY-MM-DD
 * strings compare as dates). Models with a future `deprecatedAt` are still
 * current — useful for scheduling deprecations.
 *
 * @param model - Model to check.
 * @param now - Today's date as YYYY-MM-DD. Defaults to the current UTC date.
 * @returns `true` if the model is deprecated as of `now`.
 */
export function isDeprecated(
  model: Pick<AppModelDefinition, 'deprecatedAt'>,
  now: string = new Date().toISOString().slice(0, 10),
): boolean {
  return typeof model.deprecatedAt === 'string' && model.deprecatedAt <= now
}

/**
 * Splits a model catalog into current and deprecated entries based on each
 * model's `deprecatedAt` relative to `now`. Order within each partition is
 * preserved.
 *
 * @param models - Loaded model catalog.
 * @param now - Today's date as YYYY-MM-DD. Defaults to the current UTC date.
 * @returns Object with `current` and `deprecated` arrays.
 */
export function partitionByDeprecation(
  models: readonly AppModelDefinition[],
  now: string = new Date().toISOString().slice(0, 10),
): { current: AppModelDefinition[]; deprecated: AppModelDefinition[] } {
  const current: AppModelDefinition[] = []
  const deprecated: AppModelDefinition[] = []
  for (const model of models) {
    if (isDeprecated(model, now)) deprecated.push(model)
    else current.push(model)
  }
  return { current, deprecated }
}
