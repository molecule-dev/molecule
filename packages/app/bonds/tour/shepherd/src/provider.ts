/**
 * Shepherd implementation of TourProvider.
 *
 * @module
 */

import type { ShepherdConfig } from './types.js'

/**
 *
 */
export class ShepherdTourProvider {
  readonly name = 'shepherd'

  constructor(private config: ShepherdConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: ShepherdConfig): ShepherdTourProvider {
  return new ShepherdTourProvider(config)
}
