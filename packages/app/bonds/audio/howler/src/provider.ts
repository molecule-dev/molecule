/**
 * Howler implementation of AudioProvider.
 *
 * @module
 */

import type { HowlerConfig } from './types.js'

/**
 *
 */
export class HowlerAudioProvider {
  readonly name = 'howler'

  constructor(private config: HowlerConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: HowlerConfig): HowlerAudioProvider {
  return new HowlerAudioProvider(config)
}
