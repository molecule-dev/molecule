/**
 * Openai implementation of AIProvider.
 *
 * @module
 */

import type { OpenaiConfig } from './types.js'

/**
 *
 */
export class OpenaiAIProvider {
  readonly name = 'openai'

  constructor(private config: OpenaiConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: OpenaiConfig): OpenaiAIProvider {
  return new OpenaiAIProvider(config)
}
