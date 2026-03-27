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
 *
 * @param provider
 */
export function setProvider(provider: AIVoiceProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): AIVoiceProvider | null {
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
export function requireProvider(): AIVoiceProvider {
  if (!_provider) {
    throw new Error('AIVoice provider not configured. Bond a ai-voice provider first.')
  }
  return _provider
}
