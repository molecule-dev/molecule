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
 * import { setProvider, resize, convert, getMetadata } from '@molecule/api-image'
 * import { provider as sharp } from '@molecule/api-image-sharp'
 *
 * setProvider(sharp)
 * const resized = await resize(imageBuffer, { width: 800, height: 600, fit: 'cover' })
 * const webp = await convert(imageBuffer, 'webp', 80)
 * const meta = await getMetadata(imageBuffer)
 * ```
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
export * from './types.js'

// Provider exports
export * from './provider.js'
