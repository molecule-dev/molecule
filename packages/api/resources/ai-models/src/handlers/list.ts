/**
 * `GET /ai/models` — returns the catalog of available AI models.
 *
 * Filters the central `MODELS` list to only those whose provider is currently
 * bonded under the `'ai'` category, then strips server-only fields via
 * `toPublicModel`.
 *
 * @module
 */

import { getAll } from '@molecule/api-bond'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { MODELS } from '../models.js'
import { toPublicModel } from '../projection.js'
import type { ListModelsResponse } from '../types.js'

/**
 * Returns models whose `provider` has a bond registered under the `'ai'`
 * category. When no AI providers are bonded the response is `{ models: [] }`,
 * which signals a misconfigured server rather than masking the issue.
 *
 * @param _req - The request object (unused).
 * @param res - The response object.
 */
export async function list(_req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const bondedProviders = new Set(getAll('ai').keys())
  const models = MODELS.filter((m) => bondedProviders.has(m.provider)).map(toPublicModel)
  const response: ListModelsResponse = { models }
  res.json(response)
}
