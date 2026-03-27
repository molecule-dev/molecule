/**
 * Sharp implementation of ImageProvider.
 *
 * @module
 */

import type { SharpConfig } from './types.js'

/**
 *
 */
export class SharpImageProvider {
  readonly name = 'sharp'

  constructor(private config: SharpConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: SharpConfig): SharpImageProvider {
  return new SharpImageProvider(config)
}
