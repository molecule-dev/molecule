/**
 * Image provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { ImageProvider } from './types.js'

let _provider: ImageProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: ImageProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): ImageProvider | null {
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
export function requireProvider(): ImageProvider {
  if (!_provider) {
    throw new Error('Image provider not configured. Bond a image provider first.')
  }
  return _provider
}
