/**
 * Gallery core interface for molecule.dev.
 *
 * Provides a standardized API for image gallery and lightbox UI
 * components. Bond a provider (e.g. `@molecule/app-gallery-photoswipe`)
 * to supply the concrete implementation.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { requireProvider } from '@molecule/app-gallery'
 *
 * const gallery = requireProvider().createGallery({
 *   items: [
 *     { src: '/photos/1.jpg', width: 1200, height: 800, alt: 'Sunset' },
 *   ],
 *   zoomable: true,
 * })
 * gallery.open()
 * ```
 */

export * from './provider.js'
export * from './types.js'
