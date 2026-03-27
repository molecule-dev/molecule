/**
 * ImageCrop provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { ImageCropProvider } from './types.js'

let _provider: ImageCropProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: ImageCropProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): ImageCropProvider | null {
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
export function requireProvider(): ImageCropProvider {
  if (!_provider) {
    throw new Error('ImageCrop provider not configured. Bond a image-crop provider first.')
  }
  return _provider
}
