/**
 * Provider-agnostic image processing interface for molecule.dev.
 *
 * Defines the `ImageProvider` interface for resizing, cropping, converting,
 * thumbnailing, optimizing, and extracting metadata from images. Bond packages
 * (Sharp, Jimp, etc.) implement this interface. Application code uses the
 * convenience functions (`resize`, `crop`, `convert`, `thumbnail`, `optimize`,
 * `getMetadata`) which delegate to the bonded provider.
 *
 * @example
 * ```typescript
 * import { readFile } from 'node:fs/promises'
 *
 * import { getMetadata, optimize, resize, setProvider, thumbnail } from '@molecule/api-image'
 * import { createProvider } from '@molecule/api-image-sharp'
 *
 * // Startup (server only): bond one provider. Sharp strips EXIF/GPS by default.
 * setProvider(createProvider({ defaultWebpQuality: 80, limitInputPixels: 50_000_000 }))
 *
 * // Handler: turn one uploaded image (a Buffer) into the variants the app serves.
 * async function processUpload(upload: Buffer) {
 *   const meta = await getMetadata(upload) // throws on a corrupt / non-image file
 *   const display = await resize(upload, { width: 1200, fit: 'inside', withoutEnlargement: true })
 *   const webp = await optimize(display, { format: 'webp', quality: 80 })
 *   const avatar = await thumbnail(upload, 256) // 256x256 square crop, same format as input
 *   return { width: meta.width, height: meta.height, webp, avatar }
 * }
 *
 * const variants = await processUpload(await readFile('uploads/photo.jpg'))
 * ```
 *
 * @remarks
 * - **Nothing works until a provider is bonded** — every function throws before
 *   `setProvider()`. All functions take and return a Node `Buffer`, not a path,
 *   stream, or base64 string.
 * - `resize()` defaults to `fit: 'cover'` (crops to fill both dimensions); pass
 *   `fit: 'inside'` to keep the whole image within a bounding box, and
 *   `withoutEnlargement: true` so small uploads are not upscaled.
 * - `convert(input, format, quality)` takes quality as a POSITIONAL third
 *   argument (1-100), not an options object; `optimize()` takes `{ format,
 *   quality }`.
 * - `rotate`/`flip`/`flop` are OPTIONAL provider capabilities — they throw when
 *   the bonded provider does not implement them.
 * - `getMetadata().size` is the input's byte length; `format` is a string like
 *   `'jpeg'`, not a MIME type.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Uploading an image through the UI produces the PROCESSED variant where the
 *   app uses one (thumbnail/resized/avatar) and it actually renders — check
 *   its rendered dimensions or transfer size against the original to confirm
 *   processing happened.
 * - [ ] Common input formats (JPEG, PNG, WebP) all round-trip to a rendered
 *   result.
 * - [ ] A corrupt or non-image file fails with a visible, readable error — not a
 *   server crash or a broken-image placeholder that persists.
 * - [ ] Any UI that shows image metadata (dimensions, size) matches the real
 *   file.
 * - [ ] Where optimization is wired, the served image is materially smaller than
 *   the uploaded original.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
