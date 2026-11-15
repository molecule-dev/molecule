/**
 * Svelte image gallery — the Svelte counterpart of
 * `@molecule/app-image-gallery-react`, with the same props and the same DOM.
 *
 * Exports `ImageGallery` — main image + thumbnail grid with controlled-optional
 * selection and "+N" overflow summarisation.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { ImageGallery } from '@molecule/app-image-gallery-svelte'
 *
 *   const images = [
 *     'https://example.com/photo-1.jpg',
 *     'https://example.com/photo-2.jpg',
 *     'https://example.com/photo-3.jpg',
 *   ]
 * </script>
 *
 * <!-- Uncontrolled — manages its own selected index. -->
 * <ImageGallery {images} maxThumbnails={4} />
 * ```
 *
 * @remarks
 * - Renders nothing when `images` is empty — no empty-state UI.
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

export * from './components.js'
export * from './types.js'
