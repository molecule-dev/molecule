/**
 * Pinecone implementation of AIProvider.
 *
 * @module
 */

import type { PineconeConfig } from './types.js'

/**
 *
 */
export class PineconeAIProvider {
  readonly name = 'pinecone'

  constructor(private config: PineconeConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: PineconeConfig): PineconeAIProvider {
  return new PineconeAIProvider(config)
}
