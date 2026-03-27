/**
 * Typesense implementation of SearchProvider.
 *
 * @module
 */

import type { TypesenseConfig } from './types.js'

/**
 *
 */
export class TypesenseSearchProvider {
  readonly name = 'typesense'

  constructor(private config: TypesenseConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: TypesenseConfig): TypesenseSearchProvider {
  return new TypesenseSearchProvider(config)
}
