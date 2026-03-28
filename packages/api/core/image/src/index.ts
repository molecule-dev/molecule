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
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports
export * from './provider.js'
