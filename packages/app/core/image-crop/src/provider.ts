/**
 * Image crop provider singleton.
 *
 * Bond packages call `setProvider()` during setup.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import type { ImageCropProvider } from './types.js'

let _provider: ImageCropProvider | null = null

/**
 * Registers an image crop provider as the active singleton.
 *
 * @param provider - The image crop provider implementation to bond.
 */
export function setProvider(provider: ImageCropProvider): void {
  _provider = provider
}

/**
 * Retrieves the bonded image crop provider, or `null` if none is bonded.
 *
 * @returns The active image crop provider, or `null`.
 */
export function getProvider(): ImageCropProvider | null {
  return _provider
}

/**
 * Checks whether an image crop provider has been bonded.
 *
 * @returns `true` if an image crop provider is available.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Retrieves the bonded image crop provider, throwing if none is configured.
 *
 * @returns The active image crop provider.
 * @throws {Error} if no provider has been bonded.
 */
export function requireProvider(): ImageCropProvider {
  if (!_provider) {
    throw new Error('ImageCrop provider not configured. Bond an image-crop provider first.')
  }
  return _provider
}
