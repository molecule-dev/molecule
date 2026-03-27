/**
 * Nominatim implementation of GeolocationProvider.
 *
 * @module
 */

import type { NominatimConfig } from './types.js'

/**
 *
 */
export class NominatimGeolocationProvider {
  readonly name = 'nominatim'

  constructor(private config: NominatimConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: NominatimConfig): NominatimGeolocationProvider {
  return new NominatimGeolocationProvider(config)
}
