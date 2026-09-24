/**
 * React image gallery.
 *
 * Exports `<ImageGallery>` — main image + thumbnail grid with controlled-optional
 * selection and "+N" overflow summarisation.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { ImageGallery } from '@molecule/app-image-gallery-react'
 *
 * export function ProductPhotos() {
 *   const photos = [
 *     { src: 'https://cdn.example.com/chair-front.jpg', alt: 'Oak chair, front' },
 *     { src: 'https://cdn.example.com/chair-side.jpg', alt: 'Oak chair, side' },
 *     { src: 'https://cdn.example.com/chair-back.jpg', alt: 'Oak chair, back' },
 *     { src: 'https://cdn.example.com/chair-detail.jpg', alt: 'Oak chair, joinery detail' },
 *     { src: 'https://cdn.example.com/chair-room.jpg', alt: 'Oak chair in a dining room' },
 *   ]
 *   const [active, setActive] = useState(0)
 *   return (
 *     <ImageGallery
 *       images={photos.map((p) => p.src)}
 *       alts={photos.map((p) => p.alt)}
 *       selectedIndex={active}
 *       onSelect={setActive}
 *       maxThumbnails={4}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - `images` is an array of URL STRINGS (not `{ src, alt }` objects); alt
 *   text goes in the parallel `alts` array. `selectedIndex` is optional —
 *   omit it (and `onSelect`) for self-managed selection.
 * - Only the first `maxThumbnails` images get a thumbnail button; the rest
 *   collapse into a non-clickable "+N" tile, so they are reachable only if
 *   YOU drive `selectedIndex` (e.g. prev/next buttons). There is no lightbox,
 *   swipe, or keyboard arrow navigation.
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
