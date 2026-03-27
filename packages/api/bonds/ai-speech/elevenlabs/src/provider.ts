/**
 * Elevenlabs implementation of AIProvider.
 *
 * @module
 */

import type { ElevenlabsConfig } from './types.js'

/**
 *
 */
export class ElevenlabsAIProvider {
  readonly name = 'elevenlabs'

  constructor(private config: ElevenlabsConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: ElevenlabsConfig): ElevenlabsAIProvider {
  return new ElevenlabsAIProvider(config)
}
