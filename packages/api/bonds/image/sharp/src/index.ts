/**
 * Sharp image provider for molecule.dev.
 *
 * High-performance, native image processing powered by libvips via Sharp.
 * Supports resize, crop, format conversion, thumbnailing, optimization,
 * rotation, flip, and flop operations.
 *
 * @example
 * ```typescript
 * import { readFile, writeFile } from 'node:fs/promises'
 *
 * import { getMetadata, optimize, resize, setProvider, thumbnail } from '@molecule/api-image'
 * import { createProvider } from '@molecule/api-image-sharp'
 *
 * // Startup: bond once, before any image call.
 * setProvider(createProvider({ defaultWebpQuality: 75, stripMetadata: true }))
 *
 * // Every operation takes and returns a Buffer (never a path or stream).
 * const photo = await readFile('uploads/photo.jpg')
 * const { width, height, format } = await getMetadata(photo) // e.g. 1600, 1200, 'jpeg'
 *
 * const hero = await resize(photo, { width: 1200, height: 630, fit: 'cover' }) // center-cropped
 * const avatar = await thumbnail(photo, 128) // 128×128 square
 * const webp = await optimize(hero, { format: 'webp', quality: 75 }) // EXIF/GPS stripped
 * await writeFile('uploads/photo-hero.webp', webp)
 * ```
 *
 * @remarks
 * - Bond through the core's `setProvider(...)` from `@molecule/api-image`, then
 *   call the core functions (`resize`, `optimize`, …) — calling them first
 *   throws "Image provider not configured".
 * - `resize()` defaults to `fit: 'cover'` (crops to fill) and DOES upscale
 *   unless you pass `withoutEnlargement: true`. Pass one dimension to keep the
 *   aspect ratio.
 * - `resize()` and `crop()` keep the INPUT format; use `convert()` or
 *   `optimize({ format })` to change it. Quality is 1–100.
 * - Metadata (EXIF, GPS) is stripped by default — `stripMetadata: false` on the
 *   provider (or per `optimize()` call) keeps it. `resize()`/`optimize()`
 *   auto-orient from EXIF first; `thumbnail()`, `crop()` and `convert()` do not.
 * - Native dependency: `sharp` ships prebuilt libvips binaries per
 *   platform/arch — install on the same OS/arch you deploy to (a
 *   `node_modules` copied from macOS into a Linux container fails to load).
 *   Use `@molecule/api-image-jimp` where native binaries are impossible.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
