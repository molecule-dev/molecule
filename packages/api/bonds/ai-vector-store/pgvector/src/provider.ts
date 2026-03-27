/**
 * Pgvector implementation of AIProvider.
 *
 * @module
 */

import type { PgvectorConfig } from './types.js'

/**
 *
 */
export class PgvectorAIProvider {
  readonly name = 'pgvector'

  constructor(private config: PgvectorConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: PgvectorConfig): PgvectorAIProvider {
  return new PgvectorAIProvider(config)
}
