/**
 * Hls implementation of MediaProvider.
 *
 * @module
 */

import type { HlsConfig } from './types.js'

/**
 *
 */
export class HlsMediaProvider {
  readonly name = 'hls'

  constructor(private config: HlsConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: HlsConfig): HlsMediaProvider {
  return new HlsMediaProvider(config)
}
