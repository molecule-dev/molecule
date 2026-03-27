/**
 * Cropperjs implementation of ImageProvider.
 *
 * @module
 */

import type { CropperjsConfig } from './types.js'

/**
 *
 */
export class CropperjsImageProvider {
  readonly name = 'cropperjs'

  constructor(private config: CropperjsConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: CropperjsConfig): CropperjsImageProvider {
  return new CropperjsImageProvider(config)
}
