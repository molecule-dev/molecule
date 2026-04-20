/**
 * AIVoice provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { AIVoiceProvider } from './types.js'

let _provider: AIVoiceProvider | null = null

/**
 * Registers the AI voice provider singleton.
 *
 * @param provider - The AI voice provider implementation to register.
 */
export function setProvider(provider: AIVoiceProvider): void {
  _provider = provider
}

/**
 * Returns the bonded AI voice provider, or `null` if none is registered.
 *
 * @returns The active provider, or `null`.
 */
export function getProvider(): AIVoiceProvider | null {
  return _provider
}

/**
 * Returns whether an AI voice provider has been registered.
 *
 * @returns `true` if a provider is bonded.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Returns the bonded AI voice provider, throwing if none is configured.
 *
 * @returns The active provider.
 * @throws {Error} When no provider has been bonded.
 */
export function requireProvider(): AIVoiceProvider {
  if (!_provider) {
    throw new Error('AIVoice provider not configured. Bond a ai-voice provider first.')
  }
  return _provider
}
