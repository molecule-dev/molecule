/**
 * Local implementation of AIProvider.
 *
 * @module
 */

import type { LocalConfig } from './types.js'

/**
 *
 */
export class LocalAIProvider {
  readonly name = 'local'

  constructor(private config: LocalConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: LocalConfig): LocalAIProvider {
  return new LocalAIProvider(config)
}
