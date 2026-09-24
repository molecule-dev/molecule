/**
 * Jimp image provider for molecule.dev.
 *
 * Pure-JavaScript image processing with zero native dependencies.
 * Supports resize, crop, format conversion, thumbnailing, optimization,
 * rotation, flip, and flop operations.
 *
 * @example
 * ```typescript
 * import { readFile, writeFile } from 'node:fs/promises'
 *
 * import { convert, getMetadata, resize, setProvider, thumbnail } from '@molecule/api-image'
 * import { createProvider, getSupportedFormats } from '@molecule/api-image-jimp'
 *
 * // Startup: bond once, before any image call.
 * setProvider(createProvider({ defaultJpegQuality: 80 }))
 *
 * // Every operation takes and returns a Buffer (never a path or stream).
 * const photo = await readFile('uploads/photo.png')
 * const { width, height, format } = await getMetadata(photo) // e.g. 400, 300, 'png'
 *
 * const preview = await resize(photo, { width: 200 }) // 200×150 — height follows the aspect ratio
 * const avatar = await thumbnail(photo, 64) // 64×64, center-cropped
 * const jpeg = await convert(preview, 'jpeg', 75)
 * await writeFile('uploads/photo-preview.jpg', jpeg)
 *
 * getSupportedFormats() // ['jpeg', 'png', 'gif', 'tiff'] — no webp/avif
 * ```
 *
 * @remarks
 * - **WebP and AVIF are NOT supported** — Jimp 1.x ships no codec for either.
 *   The core `ImageFormat` union includes them, but this bond does not advertise
 *   them: `getSupportedFormats()` returns only `jpeg, png, gif, tiff`. Requesting
 *   `webp`/`avif` as OUTPUT (`convert`/`optimize`) or as INPUT (any decode) fails
 *   early with a clear, actionable error that names the sharp sibling (for example:
 *   `jimp does not support the "webp" output format — use @molecule/api-image-sharp for WebP/AVIF. jimp supports: jpeg, png, gif, tiff.`),
 *   never an opaque mid-pipeline throw. The inherited E2E checklist's "WebP
 *   round-trips" item does NOT apply to this bond: feature-detect with
 *   `getSupportedFormats()` and bond `@molecule/api-image-sharp` when the app
 *   touches WebP/AVIF.
 * - Bond through the core's `setProvider(...)` from `@molecule/api-image`, then
 *   call the core functions (`resize`, `thumbnail`, …) — calling them first
 *   throws "Image provider not configured".
 * - `resize()` IGNORES `fit`, `background` and `withoutEnlargement`: with both
 *   `width` and `height` it stretches to exactly that size (and will upscale).
 *   Pass ONE dimension to keep the aspect ratio, or use `thumbnail(buf, size)`
 *   for a center-cropped square.
 * - `rotate()` ignores `background`; `getMetadata()` never fills `channels`,
 *   `density` or `orientation`.
 * - Pure-JS tradeoff: zero native dependencies (runs anywhere Node runs) but
 *   markedly slower and more memory-hungry than sharp on large images — treat
 *   sharp as the default and jimp as the no-native-binaries fallback.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
