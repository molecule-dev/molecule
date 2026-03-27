/**
 * Tanstack implementation of DataProvider.
 *
 * @module
 */

import type { TanstackConfig } from './types.js'

/**
 *
 */
export class TanstackDataProvider {
  readonly name = 'tanstack'

  constructor(private config: TanstackConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: TanstackConfig): TanstackDataProvider {
  return new TanstackDataProvider(config)
}
