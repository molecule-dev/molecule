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
 * @remarks
 * - Renders `null` when `images` is empty — no empty-state UI.
 * - `maxThumbnails` doubles as the thumbnail grid's column count. Any value is
 *   safe: it is snapped to the nearest column count the ClassMap grid actually
 *   supports (1-6 or 12), so a real `grid-cols-*` class is always emitted and
 *   extra thumbnails wrap onto additional rows instead of collapsing.
 * - Default alt text is the English "Image N" — pass `alts` with translated
 *   strings in localized apps.
 * - `getClassMap()` requires a bonded ClassMap (e.g.
 *   `@molecule/app-ui-tailwind`).
 *
 * @module
 */

export * from './ImageGallery.js'
