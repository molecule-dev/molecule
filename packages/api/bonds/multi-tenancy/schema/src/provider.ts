/**
 * Schema implementation of MultiProvider.
 *
 * @module
 */

import type { SchemaConfig } from './types.js'

/**
 *
 */
export class SchemaMultiProvider {
  readonly name = 'schema'

  constructor(private config: SchemaConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: SchemaConfig): SchemaMultiProvider {
  return new SchemaMultiProvider(config)
}
