/**
 * Database implementation of FeatureProvider.
 *
 * @module
 */

import type { DatabaseConfig } from './types.js'

/**
 *
 */
export class DatabaseFeatureProvider {
  readonly name = 'database'

  constructor(private config: DatabaseConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: DatabaseConfig): DatabaseFeatureProvider {
  return new DatabaseFeatureProvider(config)
}
