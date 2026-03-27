/**
 * Photoswipe implementation of GalleryProvider.
 *
 * @module
 */

import type { PhotoswipeConfig } from './types.js'

/**
 *
 */
export class PhotoswipeGalleryProvider {
  readonly name = 'photoswipe'

  constructor(private config: PhotoswipeConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: PhotoswipeConfig): PhotoswipeGalleryProvider {
  return new PhotoswipeGalleryProvider(config)
}
