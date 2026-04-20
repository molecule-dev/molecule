/**
 * AIClassification provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { AIClassificationProvider } from './types.js'

let _provider: AIClassificationProvider | null = null

/**
 * Registers the AI classification provider singleton.
 *
 * @param provider - The AI classification provider implementation to register.
 */
export function setProvider(provider: AIClassificationProvider): void {
  _provider = provider
}

/**
 * Returns the bonded AI classification provider, or `null` if none is registered.
 *
 * @returns The active provider, or `null`.
 */
export function getProvider(): AIClassificationProvider | null {
  return _provider
}

/**
 * Returns whether an AI classification provider has been registered.
 *
 * @returns `true` if a provider is bonded.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Returns the bonded AI classification provider, throwing if none is configured.
 *
 * @returns The active provider.
 * @throws {Error} When no provider has been bonded.
 */
export function requireProvider(): AIClassificationProvider {
  if (!_provider) {
    throw new Error(
      'AIClassification provider not configured. Bond a ai-classification provider first.',
    )
  }
  return _provider
}
