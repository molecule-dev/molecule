/**
 * AIVectorStore provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { AIVectorStoreProvider } from './types.js'

let _provider: AIVectorStoreProvider | null = null

/**
 * Set the active vector store provider.
 *
 * @param provider - The vector store provider to register.
 */
export function setProvider(provider: AIVectorStoreProvider): void {
  _provider = provider
}

/**
 * Get the active vector store provider, or null if none is configured.
 *
 * @returns The current provider or null.
 */
export function getProvider(): AIVectorStoreProvider | null {
  return _provider
}

/**
 * Check whether a vector store provider is configured.
 *
 * @returns True if a provider has been set.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Get the active vector store provider, throwing if none is configured.
 *
 * @returns The current provider.
 * @throws Error if no provider has been set.
 */
export function requireProvider(): AIVectorStoreProvider {
  if (!_provider) {
    throw new Error('AIVectorStore provider not configured. Bond a ai-vector-store provider first.')
  }
  return _provider
}
