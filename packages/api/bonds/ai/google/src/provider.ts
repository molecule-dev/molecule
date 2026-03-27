/**
 * Google implementation of AIProvider.
 *
 * @module
 */

import type { GoogleConfig } from './types.js'

/**
 *
 */
export class GoogleAIProvider {
  readonly name = 'google'

  constructor(private config: GoogleConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: GoogleConfig): GoogleAIProvider {
  return new GoogleAIProvider(config)
}
