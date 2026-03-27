/**
 * Vonage implementation of SmsProvider.
 *
 * @module
 */

import type { VonageConfig } from './types.js'

/**
 *
 */
export class VonageSmsProvider {
  readonly name = 'vonage'

  constructor(private config: VonageConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: VonageConfig): VonageSmsProvider {
  return new VonageSmsProvider(config)
}
