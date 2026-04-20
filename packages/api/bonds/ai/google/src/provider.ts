/**
 * Google implementation of AIProvider.
 *
 * @module
 */

import type { GoogleConfig } from './types.js'

/**
 * Stub Google AI provider scaffold (TODO: implement API wiring).
 */
export class GoogleAIProvider {
  readonly name = 'google'

  constructor(private config: GoogleConfig) {
    // TODO: Initialize provider
  }
}

/**
 * Creates a Google AI provider instance for bonding.
 *
 * @param config - Google provider configuration.
 * @returns A Google-backed provider instance.
 */
export function createProvider(config: GoogleConfig): GoogleAIProvider {
  return new GoogleAIProvider(config)
}
