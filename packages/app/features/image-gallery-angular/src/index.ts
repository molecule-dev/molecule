/**
 * Angular image gallery — the counterpart of `@molecule/app-image-gallery-react`:
 * the same props and the same DOM for the same input.
 *
 * Exports `<ImageGallery>` — main image + thumbnail grid with controlled-optional
 * selection and "+N" overflow summarisation.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { ImageGallery } from '@molecule/app-image-gallery-angular'
 *
 * @Component({
 *   selector: 'app-gallery',
 *   standalone: true,
 *   imports: [ImageGallery],
 *   template: `<mol-image-gallery [images]="images" [maxThumbnails]="4" />`,
 * })
 * export class Gallery {
 *   readonly images = [
 *     'https://example.com/photo-1.jpg',
 *     'https://example.com/photo-2.jpg',
 *     'https://example.com/photo-3.jpg',
 *   ]
 * }
 * ```
 *
 * @remarks
 * - Renders nothing when `images` is empty — no empty-state UI.
 * - `maxThumbnails` doubles as the thumbnail grid's column count. Any value is
 *   safe: it is snapped to the nearest column count the ClassMap grid actually
 *   supports (1-6 or 12), so a real `grid-cols-*` class is always emitted and
 *   extra thumbnails wrap onto additional rows instead of collapsing.
 * - Default alt text falls back through i18n to "Image N"
 *   (`imageGallery.alt.fallback`, English `defaultValue`) — pass `alts` with
 *   per-image strings in apps that know them.
 * - `onSelect` is the `select` output: `(select)="onSelect($event)"`.
 * - `getClassMap()` requires a bonded ClassMap (e.g.
 *   `@molecule/app-ui-tailwind`).
 *
 * @module
 */

export * from './image-gallery.component.js'
export * from './types.js'
