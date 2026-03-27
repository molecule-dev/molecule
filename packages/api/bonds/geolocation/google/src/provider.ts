/**
 * Google implementation of GeolocationProvider.
 *
 * @module
 */

import type { GoogleConfig } from './types.js'

/**
 *
 */
export class GoogleGeolocationProvider {
  readonly name = 'google'

  constructor(private config: GoogleConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: GoogleConfig): GoogleGeolocationProvider {
  return new GoogleGeolocationProvider(config)
}
