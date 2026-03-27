/**
 * Memory implementation of RateProvider.
 *
 * @module
 */

import type { MemoryConfig } from './types.js'

/**
 *
 */
export class MemoryRateProvider {
  readonly name = 'memory'

  constructor(private config: MemoryConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: MemoryConfig): MemoryRateProvider {
  return new MemoryRateProvider(config)
}
