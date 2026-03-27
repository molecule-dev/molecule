/**
 * Postgres implementation of SearchProvider.
 *
 * @module
 */

import type { PostgresConfig } from './types.js'

/**
 *
 */
export class PostgresSearchProvider {
  readonly name = 'postgres'

  constructor(private config: PostgresConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: PostgresConfig): PostgresSearchProvider {
  return new PostgresSearchProvider(config)
}
