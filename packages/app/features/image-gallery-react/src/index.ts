/**
 * React image gallery.
 *
 * Exports `<ImageGallery>` — main image + thumbnail grid with controlled-optional
 * selection and "+N" overflow summarisation.
 *
 * @example
 * ```tsx
 * import { ImageGallery } from '@molecule/app-image-gallery-react'
 *
 * const images = [
 *   'https://example.com/photo-1.jpg',
 *   'https://example.com/photo-2.jpg',
 *   'https://example.com/photo-3.jpg',
 * ]
 *
 * // Uncontrolled — manages its own selected index
 * <ImageGallery images={images} maxThumbnails={4} />
 *
 * // Controlled — caller drives selected index
 * <ImageGallery images={images} selectedIndex={activeIdx} onSelect={setActiveIdx} />
 * ```
 *
 * @module
 */

export * from './ImageGallery.js'
