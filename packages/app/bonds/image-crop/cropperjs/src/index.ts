/**
 * Cropper.js image-crop provider for `@molecule/app-image-crop` — a REAL
 * implementation backed by cropperjs v1. `createCropper({ src })` mounts a live
 * `Cropper` on an image element and every instance method delegates to the
 * corresponding cropperjs call, so `getCroppedCanvas()` returns the actual
 * cropped `<canvas>` (call `.toBlob()` / `.toDataURL()` on it to export) — not a
 * placeholder object.
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-image-crop-cropperjs'
 * import { setProvider, requireProvider } from '@molecule/app-image-crop'
 *
 * setProvider(provider)   // once, at app startup (bonds.ts)
 *
 * const cropper = requireProvider().createCropper({ src: '/avatar.jpg', aspectRatio: 1 })
 * const canvas = cropper.getCroppedCanvas({ width: 200, height: 200 })
 * canvas.toBlob((blob) => uploadAvatar(blob), 'image/png')
 * ```
 *
 * @remarks
 * - **Import cropperjs's stylesheet yourself** — this package does NOT:
 *   `import 'cropperjs/dist/cropper.css'`. Without it the crop box, handles, and
 *   drag guides render unstyled (an invisible/broken cropper), the same way Quill
 *   needs its theme CSS.
 * - **Browser-only.** `createCropper()` calls `document.createElement('img')` and
 *   `new Cropper(...)`; construct it in a client-only effect under SSR.
 * - **cropperjs initializes on the image's `load` event.** Reading `getCropData()`
 *   or `getCroppedCanvas()` before the source has loaded returns empty/degenerate
 *   data — drive them after load, or set the region explicitly with `setCropData()`
 *   in natural-image coordinates first.
 * - **`circular` is a UI concern, not a pixel op.** cropperjs has no circular
 *   pixel output; for a round avatar, style the crop box round in CSS
 *   (`.cropper-view-box, .cropper-face { border-radius: 50% }`) and draw the
 *   returned canvas into a rounded canvas before upload.
 * - **`OutputOptions.quality` applies at encode time**, not to canvas generation —
 *   pass it to `canvas.toBlob(cb, 'image/jpeg', quality)` / `toDataURL(type, quality)`.
 * - Provider defaults (`guides`, `background`, `viewMode`) come from
 *   `createProvider(config)`; per-cropper `CropperOptions.guides` wins over the
 *   config default. `maxWidth`/`maxHeight` are enforced on output (cropperjs has no
 *   max-crop-box constructor option).
 * - **Wire with `setProvider()` from `@molecule/app-image-crop`** — the core keeps a
 *   module-local singleton; a generic `bond('image-crop', …)` silently no-ops and
 *   `requireProvider()` throws.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'

// Re-export Cropper for advanced usage (custom cropperjs options / events).
export { default as Cropper } from 'cropperjs'
