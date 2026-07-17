/**
 * PhotoSwipe v5 gallery provider implementation.
 *
 * Drives the real PhotoSwipe lightbox via the programmatic `PhotoSwipe` core
 * class (not `PhotoSwipeLightbox`, which is the delegated-DOM variant that binds
 * to gallery markup): `open()` constructs `new PhotoSwipe({ dataSource, index })`
 * and calls `.init()` to display it; `close()`/`next()`/`previous()`/`goTo()`
 * delegate to the live instance.
 *
 * @module
 */

import type { PhotoSwipeOptions, SlideData } from 'photoswipe'
import PhotoSwipe from 'photoswipe'

import type {
  GalleryInstance,
  GalleryItem,
  GalleryOptions,
  GalleryProvider,
} from '@molecule/app-gallery'

import type { PhotoSwipeConfig } from './types.js'

/**
 * Maps a core `GalleryItem` to a PhotoSwipe `SlideData` entry.
 *
 * @param item - The core gallery item.
 * @returns A PhotoSwipe slide descriptor.
 */
function toSlideData(item: GalleryItem): SlideData {
  return {
    src: item.src,
    width: item.width,
    height: item.height,
    alt: item.alt,
    // Thumbnail becomes the low-res placeholder shown before the full image loads.
    msrc: item.thumbnail,
    // `caption` is carried through as an arbitrary slide prop (SlideData allows extra keys).
    caption: item.caption,
  }
}

/**
 * Returns `true` when `index` is a valid position within a list of `length`.
 *
 * @param index - Candidate zero-based index.
 * @param length - Number of items.
 * @returns Whether the index is in range.
 */
function isValidIndex(index: number, length: number): boolean {
  return index >= 0 && index < length
}

/**
 * Creates a PhotoSwipe-based gallery provider.
 *
 * Per-gallery `GalleryOptions` (`zoomable`, `showCounter`) override the
 * provider-level `PhotoSwipeConfig`; both default to PhotoSwipe's own defaults.
 *
 * @param config - Optional provider-level configuration.
 * @returns A configured GalleryProvider backed by PhotoSwipe v5.
 */
export function createProvider(config: PhotoSwipeConfig = {}): GalleryProvider {
  return {
    name: 'photoswipe',

    createGallery(options: GalleryOptions): GalleryInstance {
      const items = options.items
      const slides = items.map(toSlideData)

      // Per-gallery options override provider config; both fall back to "on" (PhotoSwipe's default).
      const zoom = options.zoomable ?? config.zoomable ?? true
      const counter = options.showCounter ?? config.showCounter ?? true

      // Mirror of the visible index while the lightbox is closed; PhotoSwipe is authoritative while open.
      let currentIndex = options.startIndex ?? 0
      let pswp: PhotoSwipe | null = null

      return {
        open(index?: number): void {
          const startIndex =
            index !== undefined && isValidIndex(index, items.length) ? index : currentIndex
          currentIndex = startIndex

          // Already open — navigate the live lightbox instead of stacking a second instance.
          if (pswp) {
            pswp.goTo(startIndex)
            return
          }

          const pswpOptions: PhotoSwipeOptions = {
            dataSource: slides,
            index: startIndex,
            zoom,
            counter,
          }

          const instance = new PhotoSwipe(pswpOptions)

          // Track PhotoSwipe's own navigation (arrows, swipe, keyboard) so getCurrentIndex() stays accurate.
          instance.on('change', () => {
            currentIndex = instance.currIndex
          })

          // Fire onClose when the lightbox closes (close button, Esc, swipe-down, or our close()).
          instance.on('close', () => {
            options.onClose?.()
          })

          // Drop the reference once torn down so a later open() builds a fresh instance.
          instance.on('destroy', () => {
            pswp = null
          })

          pswp = instance
          instance.init()
        },

        close(): void {
          if (pswp) {
            // Real teardown — PhotoSwipe fires `close` (→ onClose) then `destroy`.
            pswp.close()
            return
          }
          // Never opened: still honor the close contract.
          options.onClose?.()
        },

        next(): void {
          if (pswp) {
            pswp.next()
            return
          }
          if (currentIndex < items.length - 1) {
            currentIndex++
          }
        },

        previous(): void {
          if (pswp) {
            pswp.prev()
            return
          }
          if (currentIndex > 0) {
            currentIndex--
          }
        },

        goTo(index: number): void {
          if (!isValidIndex(index, items.length)) {
            return
          }
          currentIndex = index
          pswp?.goTo(index)
        },

        getCurrentIndex(): number {
          return pswp ? pswp.currIndex : currentIndex
        },
      }
    },
  }
}

/** Default PhotoSwipe gallery provider instance. */
export const provider: GalleryProvider = createProvider()
