/**
 * Deepl implementation of AIProvider.
 *
 * @module
 */

import type { DeeplConfig } from './types.js'

/**
 *
 */
export class DeeplAIProvider {
  readonly name = 'deepl'

  constructor(private config: DeeplConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: DeeplConfig): DeeplAIProvider {
  return new DeeplAIProvider(config)
}
