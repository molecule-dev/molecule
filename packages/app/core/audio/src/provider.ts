/**
 * Audio provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { AudioProvider } from './types.js'

let _provider: AudioProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: AudioProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): AudioProvider | null {
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
export function requireProvider(): AudioProvider {
  if (!_provider) {
    throw new Error('Audio provider not configured. Bond a audio provider first.')
  }
  return _provider
}
