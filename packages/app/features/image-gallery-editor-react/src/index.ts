/**
 * `@molecule/app-image-gallery-editor-react` — hero drop zone + side grid of
 * thumbnail slots. Click an empty slot or the drop zone to upload; click a
 * filled slot to remove (native `window.confirm`).
 *
 * Stateless about persistence — the consumer owns the slot array and handles
 * uploads via `onPickFiles` (defaults to local object URLs for preview).
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 * import { ImageGalleryEditor } from '@molecule/app-image-gallery-editor-react'
 *
 * function GalleryEditor() {
 *   const [slots, setSlots] = useState<(string | null)[]>(Array(4).fill(null))
 *   return (
 *     <ImageGalleryEditor
 *       slots={slots}
 *       onChange={setSlots}
 *       onPickFiles={async (files) => {
 *         // upload each file, return persisted URLs (null keeps a slot empty)
 *         return Array.from(files).map((f) => URL.createObjectURL(f))
 *       }}
 *       header={<h3>Image Gallery</h3>}
 *       counter={`${slots.filter(Boolean).length} / 24 Photos`}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - HARD PREREQUISITES: this component styles itself with raw Tailwind
 *   utilities and Material-3 color tokens (`bg-surface-container-low`,
 *   `border-outline-variant`, `text-on-surface`, `font-headline`, …). The
 *   host app's Tailwind build must (a) source-scan this package's dist (add
 *   `@source "../node_modules/@molecule/app-image-gallery-editor-react/dist";`
 *   to the CSS entry — scaffolds do NOT include it by default) and (b) define
 *   the Material-3 color tokens in its theme (the polished flagship templates
 *   do; a plain scaffold does not). Without both, the layout collapses and
 *   the raw file input renders visible.
 * - Icons are Material Symbols ligatures (`cloud_upload`, `delete`) — the
 *   Material Symbols Outlined font must be loaded (scaffolded `index.html`
 *   links it; other hosts must add the stylesheet) or the icon names render
 *   as literal text.
 * - `dropZoneTitle` / `dropZoneHint` / `confirmRemoveMessage` default to
 *   English strings — pass translated values (`t('...')`) in localized apps.
 * - `getClassMap()` requires a bonded ClassMap for the layout primitives.
 *
 * @module
 */

export * from './ImageGalleryEditor.js'
