/**
 * Encryption provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { EncryptionProvider } from './types.js'

let _provider: EncryptionProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: EncryptionProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): EncryptionProvider | null {
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
export function requireProvider(): EncryptionProvider {
  if (!_provider) {
    throw new Error('Encryption provider not configured. Bond a encryption provider first.')
  }
  return _provider
}
