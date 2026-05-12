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
