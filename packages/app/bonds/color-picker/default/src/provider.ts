/**
 * Default implementation of ColorProvider.
 *
 * @module
 */

import type { DefaultConfig } from './types.js'

/**
 *
 */
export class DefaultColorProvider {
  readonly name = 'default'

  constructor(private config: DefaultConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: DefaultConfig): DefaultColorProvider {
  return new DefaultColorProvider(config)
}
