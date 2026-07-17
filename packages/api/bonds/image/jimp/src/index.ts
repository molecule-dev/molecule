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
 * - **WebP and AVIF are NOT supported** — Jimp 1.x ships no codec for either.
 *   The core `ImageFormat` union includes them, but this bond does not advertise
 *   them: `getSupportedFormats()` returns only `jpeg, png, gif, tiff`. Requesting
 *   `webp`/`avif` as OUTPUT (`convert`/`optimize`) or as INPUT (any decode) fails
 *   early with a clear, actionable error that names the sharp sibling (for example:
 *   `jimp does not support the "webp" output format — use \@molecule/api-image-sharp for WebP/AVIF. jimp supports: jpeg, png, gif, tiff.`),
 *   never an opaque mid-pipeline throw. The inherited E2E checklist's "WebP
 *   round-trips" item does NOT apply to this bond: feature-detect with
 *   `getSupportedFormats()` and bond `@molecule/api-image-sharp` when the app
 *   touches WebP/AVIF.
 * - Pure-JS tradeoff: zero native dependencies (runs anywhere Node runs) but
 *   markedly slower and more memory-hungry than sharp on large images — treat
 *   sharp as the default and jimp as the no-native-binaries fallback.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
