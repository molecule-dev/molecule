/**
 * Local implementation of AIProvider.
 *
 * @module
 */

import type { LocalConfig } from './types.js'

/**
 * Stub local AI provider scaffold (TODO: implement API wiring).
 */
export class LocalAIProvider {
  readonly name = 'local'

  constructor(private config: LocalConfig) {
    // TODO: Initialize provider
  }
}

/**
 * Creates a local AI provider instance for bonding.
 *
 * @param config - Local provider configuration.
 * @returns A local-backed provider instance.
 */
export function createProvider(config: LocalConfig): LocalAIProvider {
  return new LocalAIProvider(config)
}
