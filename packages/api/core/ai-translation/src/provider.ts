/**
 * AITranslation provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { AITranslationProvider } from './types.js'

let _provider: AITranslationProvider | null = null

/**
 * Registers the AI translation provider singleton.
 *
 * @param provider - The AI translation provider implementation to register.
 */
export function setProvider(provider: AITranslationProvider): void {
  _provider = provider
}

/**
 * Returns the bonded AI translation provider, or `null` if none is registered.
 *
 * @returns The active provider, or `null`.
 */
export function getProvider(): AITranslationProvider | null {
  return _provider
}

/**
 * Returns whether an AI translation provider has been registered.
 *
 * @returns `true` if a provider is bonded.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Returns the bonded AI translation provider, throwing if none is configured.
 *
 * @returns The active provider.
 * @throws {Error} When no provider has been bonded.
 */
export function requireProvider(): AITranslationProvider {
  if (!_provider) {
    throw new Error('AITranslation provider not configured. Bond a ai-translation provider first.')
  }
  return _provider
}
