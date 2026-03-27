/**
 * AIEmbeddings provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { AIEmbeddingsProvider } from './types.js'

let _provider: AIEmbeddingsProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: AIEmbeddingsProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): AIEmbeddingsProvider | null {
  return _provider
}

/**
 *
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 *
 */
export function requireProvider(): AIEmbeddingsProvider {
  if (!_provider) {
    throw new Error('AIEmbeddings provider not configured. Bond a ai-embeddings provider first.')
  }
  return _provider
}
