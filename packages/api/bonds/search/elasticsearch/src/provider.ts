/**
 * Elasticsearch implementation of SearchProvider.
 *
 * @module
 */

import type { ElasticsearchConfig } from './types.js'

/**
 *
 */
export class ElasticsearchSearchProvider {
  readonly name = 'elasticsearch'

  constructor(private config: ElasticsearchConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: ElasticsearchConfig): ElasticsearchSearchProvider {
  return new ElasticsearchSearchProvider(config)
}
