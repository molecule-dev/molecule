/**
 * Jimp image provider for molecule.dev.
 *
 * Pure-JavaScript image processing with zero native dependencies.
 * Supports resize, crop, format conversion, thumbnailing, optimization,
 * rotation, flip, and flop operations.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-image'
 * import { provider } from '@molecule/api-image-jimp'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * - **WebP and AVIF are NOT supported.** The core `ImageFormat` union includes
 *   them, but any jimp operation targeting `webp`/`avif` throws
 *   (`Jimp does not support the "webp" format. Supported formats: jpeg, png,
 *   gif, tiff.`), and WebP input cannot be decoded either. The inherited E2E
 *   checklist's "WebP round-trips" item does NOT apply to this bond — if the
 *   app touches WebP/AVIF, bond `@molecule/api-image-sharp` instead.
 * - Pure-JS tradeoff: zero native dependencies (runs anywhere Node runs) but
 *   markedly slower and more memory-hungry than sharp on large images — treat
 *   sharp as the default and jimp as the no-native-binaries fallback.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
