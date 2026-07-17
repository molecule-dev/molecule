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
 * import { setProvider, requireProvider } from '@molecule/app-image-crop'
 * import { provider } from '@molecule/app-image-crop-cropperjs'
 *
 * setProvider(provider)                    // once, at app startup (bonds.ts)
 *
 * const cropper = requireProvider().createCropper({
 *   src: '/photos/avatar.jpg',
 *   aspectRatio: 1,
 *   circular: true,
 * })
 * const canvas = cropper.getCroppedCanvas({ width: 200, height: 200 })
 * canvas.toBlob((blob) => uploadAvatar(blob))
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
