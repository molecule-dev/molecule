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
 * - Styling is 100% ClassMap (`getClassMap()` / `cm.*`) — the editor renders
 *   correctly out of the box under any bonded styling library and needs NO
 *   per-app Tailwind `@source` scan of this package. (It previously hardcoded
 *   raw Tailwind + Material-3 utility classes that no scaffold `@source`-scans,
 *   so even the `hidden` file input never generated a rule and rendered
 *   visible; the file input is now hidden with an inline `display:none`.) The
 *   few `style={...}` values (grid-column span, aspect ratio, corner radius,
 *   the dashed drop-zone border, `object-fit`, dim opacity, `display:none`)
 *   are the documented ClassMap-can't-express cases and use real theme tokens.
 * - Icons are real SVG glyphs from `@molecule/app-ui-react`'s `<Icon>`
 *   (`upload`, `trash`, and the `emptySlotIcon` — a typed `IconName`) — NO
 *   Material Symbols font to load. Requires a bonded `@molecule/app-icons` set.
 * - The filled-slot delete affordance is always visible (touch-friendly)
 *   rather than hover-revealed.
 * - `dropZoneTitle` / `dropZoneHint` / `confirmRemoveMessage` default to
 *   English strings — pass translated values (`t('...')`) in localized apps.
 * - `getClassMap()` requires a bonded ClassMap for the layout primitives.
 *
 * @module
 */

export * from './ImageGalleryEditor.js'
