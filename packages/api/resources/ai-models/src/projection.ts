/**
 * Projects a server-side `ModelDefinition` to the wire-shape `PublicModel`
 * returned by `GET /ai/models`. Drops `outputPricePerMTok` (server-only).
 *
 * @module
 */

import type { ModelDefinition, PublicModel } from './types.js'

/**
 * Returns the public projection of a model definition — every field except
 * `outputPricePerMTok`, which stays server-only.
 *
 * @param model - The full server-side model definition.
 * @returns The client-safe projection.
 */
export function toPublicModel(model: ModelDefinition): PublicModel {
  const { outputPricePerMTok: _outputPricePerMTok, ...publicFields } = model
  return publicFields
}
