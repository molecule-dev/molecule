/**
 * AIRag provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { AIRagProvider } from './types.js'

let _provider: AIRagProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: AIRagProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): AIRagProvider | null {
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
export function requireProvider(): AIRagProvider {
  if (!_provider) {
    throw new Error('AIRag provider not configured. Bond a ai-rag provider first.')
  }
  return _provider
}
