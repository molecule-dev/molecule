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
 * Registers the AI embeddings provider singleton.
 *
 * @param provider - The AI embeddings provider implementation to register.
 */
export function setProvider(provider: AIEmbeddingsProvider): void {
  _provider = provider
}

/**
 * Returns the bonded AI embeddings provider, or `null` if none is registered.
 *
 * @returns The active provider, or `null`.
 */
export function getProvider(): AIEmbeddingsProvider | null {
  return _provider
}

/**
 * Returns whether an AI embeddings provider has been registered.
 *
 * @returns `true` if a provider is bonded.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Returns the bonded AI embeddings provider, throwing if none is configured.
 *
 * @returns The active provider.
 * @throws {Error} When no provider has been bonded.
 */
export function requireProvider(): AIEmbeddingsProvider {
  if (!_provider) {
    throw new Error('AIEmbeddings provider not configured. Bond a ai-embeddings provider first.')
  }
  return _provider
}
