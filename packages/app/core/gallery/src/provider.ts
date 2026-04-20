/**
 * Gallery provider singleton.
 *
 * Bond packages call `setProvider()` during setup.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import type { GalleryProvider } from './types.js'

let _provider: GalleryProvider | null = null

/**
 * Registers a gallery provider as the active singleton.
 *
 * @param provider - The gallery provider implementation to bond.
 */
export function setProvider(provider: GalleryProvider): void {
  _provider = provider
}

/**
 * Retrieves the bonded gallery provider, or `null` if none is bonded.
 *
 * @returns The active gallery provider, or `null`.
 */
export function getProvider(): GalleryProvider | null {
  return _provider
}

/**
 * Checks whether a gallery provider has been bonded.
 *
 * @returns `true` if a gallery provider is available.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Retrieves the bonded gallery provider, throwing if none is configured.
 *
 * @returns The active gallery provider.
 * @throws {Error} if no provider has been bonded.
 */
export function requireProvider(): GalleryProvider {
  if (!_provider) {
    throw new Error('Gallery provider not configured. Bond a gallery provider first.')
  }
  return _provider
}
