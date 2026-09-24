/**
 * Image crop core interface for molecule.dev.
 *
 * Framework-agnostic contract for image cropping: crop-region **state**
 * (rect, rotation, zoom) plus cropped-canvas output. Bond a provider (e.g.
 * `@molecule/app-image-crop-cropperjs`) to supply the crop math; your UI
 * renders the preview and drag handles and feeds gestures into the instance.
 *
 * @example
 * ```typescript
 * import { post } from '@molecule/app-http'
 * import { requireProvider, setProvider } from '@molecule/app-image-crop'
 * import { provider } from '@molecule/app-image-crop-cropperjs'
 * // + `import 'cropperjs/dist/cropper.css'` once in your app entry
 *
 * setProvider(provider) // once, at app startup (bonds.ts)
 *
 * // Browser only (a client-side effect) — cropperjs needs the DOM.
 * const cropper = requireProvider().createCropper({ src: '/photos/avatar.jpg', aspectRatio: 1 })
 *
 * // From your drag handles, after the image loaded — NATURAL-image pixel coordinates:
 * cropper.setCropData({ x: 120, y: 40, width: 400, height: 400, rotate: 0, scaleX: 1, scaleY: 1 })
 * const canvas = cropper.getCroppedCanvas({ width: 256, height: 256, fillColor: '#ffffff' })
 * cropper.destroy()
 *
 * canvas.toBlob(async (blob) => {
 *   if (!blob) return
 *   const body = new FormData()
 *   body.append('file', blob, 'avatar.png')
 *   await post('/users/me/avatar', body) // the server re-validates type/size
 * }, 'image/png')
 * ```
 *
 * @remarks
 * - **The instance is headless — no crop UI mounts anywhere.** Render the image,
 *   crop-box overlay, and handles yourself (styled via `getClassMap()`/`cm.*`) and
 *   translate drag/resize gestures into `setCropData()` / `rotate()` / `zoom()`;
 *   read `getCropData()` to draw the overlay.
 * - **Verify the cropped output end-to-end before shipping** — draw the returned
 *   canvas into the page or upload-and-render it; an empty/blank result means the
 *   bonded provider does not implement canvas output, which is an integration bug
 *   to fix, not to skip.
 * - **Wire with THIS package's `setProvider()` or `bond('image-crop', …)`** —
 *   `setProvider()` delegates into the shared `@molecule/app-bond` registry, so both
 *   write the same slot; `requireProvider()` throws until one has run.
 * - Read/export AFTER the image has loaded (cropperjs initializes on `load`), or set
 *   the region with `setCropData()` first — otherwise the output is empty.
 * - `circular: true` does NOT produce round pixels with the cropperjs bond — round the
 *   crop box in CSS and mask the returned canvas yourself.
 * - Upload the result as a Blob (`canvas.toBlob`) through your upload path; the
 *   server must re-validate the file (type/size) — client cropping is UX, not a
 *   boundary.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt each
 * item to this app's actual crop screen (avatar/photo upload, etc.), and check
 * every box off one by one. A box you can't check is an integration bug to fix —
 * not a skip. The cropper is headless, so verify the UI YOU rendered:
 * - [ ] Opening the crop screen loads the source image (`createCropper({ src })`)
 *   and renders it with a visible crop-box overlay + drag handles drawn from
 *   `getCropData()` — not a blank or full-bleed image with no selection.
 * - [ ] Dragging/resizing the crop box feeds the gesture into `setCropData()`,
 *   `getCropData()` reflects the new x/y/width/height, and the on-page preview
 *   (the `getCroppedCanvas()` output drawn into the page) updates to show ONLY
 *   the selected area, not the whole image.
 * - [ ] With an aspect-ratio lock (e.g. `aspectRatio: 1` for an avatar) the crop
 *   box stays that ratio while you resize — `getCropData()` width == height for
 *   1:1 — and `circular: true` clips the preview to a circle.
 * - [ ] `rotate()` / `zoom()` transform the source and the crop overlay follows:
 *   `getCropData().rotate` / `scaleX` change and the preview re-renders the
 *   transformed region — the selection isn't stranded on the old orientation.
 * - [ ] Applying the crop OUTPUTS the cropped image: `getCroppedCanvas()` pixels
 *   match the selected region (not the full source), and downstream the SAVED
 *   file is the cropped Blob (`canvas.toBlob` → upload) — re-fetch and render the
 *   stored image and confirm it shows the crop, never the original.
 * - [ ] Min/max crop size is enforced — you cannot drag the box smaller than
 *   `minWidth`/`minHeight` or larger than `maxWidth`/`maxHeight`.
 * - [ ] Cancel/close discards without mutating the source: the original image is
 *   unchanged and no cropped result is saved.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
