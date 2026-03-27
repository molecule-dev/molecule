/**
 * Chroma implementation of AIProvider.
 *
 * @module
 */

import type { ChromaConfig } from './types.js'

/**
 *
 */
export class ChromaAIProvider {
  readonly name = 'chroma'

  constructor(private config: ChromaConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: ChromaConfig): ChromaAIProvider {
  return new ChromaAIProvider(config)
}
