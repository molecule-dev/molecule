/**
 * Redis implementation of RateProvider.
 *
 * @module
 */

import type { RedisConfig } from './types.js'

/**
 *
 */
export class RedisRateProvider {
  readonly name = 'redis'

  constructor(private config: RedisConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: RedisConfig): RedisRateProvider {
  return new RedisRateProvider(config)
}
