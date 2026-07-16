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
 * - **Wire with `setProvider()` from THIS package, not `bond('image-crop', …)`** —
 *   the singleton is module-local; `requireProvider()` throws otherwise.
 * - Upload the result as a Blob (`canvas.toBlob`) through your upload path; the
 *   server must re-validate the file (type/size) — client cropping is UX, not a
 *   boundary.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
