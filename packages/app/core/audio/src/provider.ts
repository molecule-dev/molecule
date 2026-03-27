/**
 * Audio provider singleton.
 *
 * Bond packages call `setProvider()` during setup.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import type { AudioProvider } from './types.js'

let _provider: AudioProvider | null = null

/**
 * Registers an audio provider as the active singleton.
 *
 * @param provider - The audio provider implementation to bond.
 */
export function setProvider(provider: AudioProvider): void {
  _provider = provider
}

/**
 * Retrieves the bonded audio provider, or `null` if none is bonded.
 *
 * @returns The active audio provider, or `null`.
 */
export function getProvider(): AudioProvider | null {
  return _provider
}

/**
 * Checks whether an audio provider has been bonded.
 *
 * @returns `true` if an audio provider is available.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Retrieves the bonded audio provider, throwing if none is configured.
 *
 * @returns The active audio provider.
 * @throws Error if no provider has been bonded.
 */
export function requireProvider(): AudioProvider {
  if (!_provider) {
    throw new Error('Audio provider not configured. Bond an audio provider first.')
  }
  return _provider
}
