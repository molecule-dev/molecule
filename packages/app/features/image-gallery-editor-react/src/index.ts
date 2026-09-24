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
 *
 * import { post } from '@molecule/app-http'
 * import { ImageGalleryEditor } from '@molecule/app-image-gallery-editor-react'
 *
 * export function ListingPhotos() {
 *   const [slots, setSlots] = useState<(string | null)[]>([null, null, null, null])
 *   const [error, setError] = useState<string | null>(null)
 *
 *   async function upload(files: FileList): Promise<(string | null)[]> {
 *     setError(null)
 *     return Promise.all(
 *       Array.from(files).map(async (file) => {
 *         const form = new FormData()
 *         form.append('file', file)
 *         try {
 *           const res = await post<{ url: string }>('/uploads', form)
 *           return res.data.url
 *         } catch (err) {
 *           setError(err instanceof Error ? err.message : String(err))
 *           return null // keeps the slot empty
 *         }
 *       }),
 *     )
 *   }
 *
 *   return (
 *     <ImageGalleryEditor
 *       slots={slots}
 *       onChange={setSlots}
 *       onPickFiles={upload}
 *       maxImages={4}
 *       counter={`${slots.filter(Boolean).length} / ${slots.length}`}
 *       statusMessage={error}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - It does NOT upload: without `onPickFiles` it stores `blob:` object URLs
 *   that vanish on reload. Pass `onPickFiles` to upload (through
 *   `@molecule/app-http`) and return the persisted URLs, one per file
 *   (`null` keeps a slot empty). It is NOT caught for you — a rejected
 *   promise is an unhandled rejection, so catch per file and surface the error
 *   (e.g. via `statusMessage`).
 * - `slots` is controlled and its LENGTH is the number of slots rendered —
 *   start with `[null, null, …]`, not `[]` (an empty array renders no slots
 *   and has no free slot to fill). Clicking a filled slot asks
 *   `window.confirm(confirmRemoveMessage)` and then sets it to `null`.
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
