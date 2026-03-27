/**
 * Mapbox implementation of GeolocationProvider.
 *
 * @module
 */

import type { MapboxConfig } from './types.js'

/**
 *
 */
export class MapboxGeolocationProvider {
  readonly name = 'mapbox'

  constructor(private config: MapboxConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: MapboxConfig): MapboxGeolocationProvider {
  return new MapboxGeolocationProvider(config)
}
