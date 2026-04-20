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
 * Registers the AI RAG provider singleton.
 *
 * @param provider - The AI RAG provider implementation to register.
 */
export function setProvider(provider: AIRagProvider): void {
  _provider = provider
}

/**
 * Returns the bonded AI RAG provider, or `null` if none is registered.
 *
 * @returns The active provider, or `null`.
 */
export function getProvider(): AIRagProvider | null {
  return _provider
}

/**
 * Returns whether an AI RAG provider has been registered.
 *
 * @returns `true` if a provider is bonded.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Returns the bonded AI RAG provider, throwing if none is configured.
 *
 * @returns The active provider.
 * @throws {Error} When no provider has been bonded.
 */
export function requireProvider(): AIRagProvider {
  if (!_provider) {
    throw new Error('AIRag provider not configured. Bond a ai-rag provider first.')
  }
  return _provider
}
