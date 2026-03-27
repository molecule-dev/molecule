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
 *
 * @param provider
 */
export function setProvider(provider: AISpeechProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): AISpeechProvider | null {
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
export function requireProvider(): AISpeechProvider {
  if (!_provider) {
    throw new Error('AISpeech provider not configured. Bond a ai-speech provider first.')
  }
  return _provider
}
