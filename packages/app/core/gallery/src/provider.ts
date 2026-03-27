/**
 * Gallery provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { GalleryProvider } from './types.js'

let _provider: GalleryProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: GalleryProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): GalleryProvider | null {
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
export function requireProvider(): GalleryProvider {
  if (!_provider) {
    throw new Error('Gallery provider not configured. Bond a gallery provider first.')
  }
  return _provider
}
