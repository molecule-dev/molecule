/**
 * Meilisearch implementation of SearchProvider.
 *
 * @module
 */

import type { MeilisearchConfig } from './types.js'

/**
 *
 */
export class MeilisearchSearchProvider {
  readonly name = 'meilisearch'

  constructor(private config: MeilisearchConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: MeilisearchConfig): MeilisearchSearchProvider {
  return new MeilisearchSearchProvider(config)
}
