/**
 * PhotoSwipe-compatible gallery provider implementation.
 *
 * @module
 */

import type { GalleryInstance, GalleryOptions, GalleryProvider } from '@molecule/app-gallery'

import type { PhotoSwipeConfig } from './types.js'

/**
 * Creates a PhotoSwipe-based gallery provider.
 *
 * @param _config - Optional provider configuration.
 * @returns A configured GalleryProvider.
 */
export function createProvider(_config?: PhotoSwipeConfig): GalleryProvider {
  return {
    name: 'photoswipe',

    createGallery(options: GalleryOptions): GalleryInstance {
      let currentIndex = options.startIndex ?? 0
      const items = options.items

      return {
        open(index?: number): void {
          if (index !== undefined && index >= 0 && index < items.length) {
            currentIndex = index
          }
        },

        close(): void {
          options.onClose?.()
        },

        next(): void {
          if (currentIndex < items.length - 1) {
            currentIndex++
          }
        },

        previous(): void {
          if (currentIndex > 0) {
            currentIndex--
          }
        },

        goTo(index: number): void {
          if (index >= 0 && index < items.length) {
            currentIndex = index
          }
        },

        getCurrentIndex(): number {
          return currentIndex
        },
      }
    },
  }
}

/** Default PhotoSwipe gallery provider instance. */
export const provider: GalleryProvider = createProvider()
