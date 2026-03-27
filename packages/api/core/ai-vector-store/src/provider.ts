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
 *
 * @param provider
 */
export function setProvider(provider: AIVectorStoreProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): AIVectorStoreProvider | null {
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
export function requireProvider(): AIVectorStoreProvider {
  if (!_provider) {
    throw new Error('AIVectorStore provider not configured. Bond a ai-vector-store provider first.')
  }
  return _provider
}
