/**
 * AISpeech provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { AISpeechProvider } from './types.js'

let _provider: AISpeechProvider | null = null

/**
 * Register an AISpeech provider implementation.
 *
 * @param provider - The speech provider to register.
 */
export function setProvider(provider: AISpeechProvider): void {
  _provider = provider
}

/**
 * Get the registered AISpeech provider, or null if none is registered.
 *
 * @returns The registered provider, or null.
 */
export function getProvider(): AISpeechProvider | null {
  return _provider
}

/**
 * Check whether an AISpeech provider is registered.
 *
 * @returns True if a provider has been registered.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Get the registered AISpeech provider, throwing if none is registered.
 *
 * @returns The registered provider.
 * @throws Error if no provider has been registered.
 */
export function requireProvider(): AISpeechProvider {
  if (!_provider) {
    throw new Error('AISpeech provider not configured. Bond a ai-speech provider first.')
  }
  return _provider
}
