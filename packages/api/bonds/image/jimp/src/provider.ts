/**
 * Jimp implementation of ImageProvider.
 *
 * @module
 */

import type { JimpConfig } from './types.js'

/**
 *
 */
export class JimpImageProvider {
  readonly name = 'jimp'

  constructor(private config: JimpConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: JimpConfig): JimpImageProvider {
  return new JimpImageProvider(config)
}
