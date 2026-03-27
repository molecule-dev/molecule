/**
 * Tanstack implementation of VirtualProvider.
 *
 * @module
 */

import type { TanstackConfig } from './types.js'

/**
 *
 */
export class TanstackVirtualProvider {
  readonly name = 'tanstack'

  constructor(private config: TanstackConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: TanstackConfig): TanstackVirtualProvider {
  return new TanstackVirtualProvider(config)
}
