/**
 * Stability implementation of AIProvider.
 *
 * @module
 */

import type { StabilityConfig } from './types.js'

/**
 *
 */
export class StabilityAIProvider {
  readonly name = 'stability'

  constructor(private config: StabilityConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: StabilityConfig): StabilityAIProvider {
  return new StabilityAIProvider(config)
}
