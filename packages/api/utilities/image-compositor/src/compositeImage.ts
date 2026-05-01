/**
 * `compositeImage` — flatten a {@link LayeredImage} document into a
 * single PNG/JPEG/WebP buffer.
 *
 * The function is decoupled from any concrete image library: it depends
 * only on a {@link RasterCodec}, resolved at call time from the bonded
 * `@molecule/api-image` provider unless an explicit codec is supplied
 * via `deps.raster`.
 *
 * @module
 */

import { compositeRgba } from './compositeRgba.js'
import { getRasterCodec } from './raster.js'
import type {
  CompositeFormat,
  CompositeOptions,
  CompositorDependencies,
  LayeredImage,
} from './types.js'

/**
 * Flatten a layered image document into an encoded image buffer.
 *
 * Stages:
 * 1. Compose every layer into a flat RGBA raster (`compositeRgba`).
 * 2. Optionally resize the flat raster (`raster.resizeRaw`).
 * 3. Encode the result in the requested output format (`raster.encode`).
 *
 * @param doc - Layered-image document.
 * @param options - Output format / quality / optional resize.
 * @param deps - Optional dependency injection. When omitted, the bonded
 *   `@molecule/api-image` provider is used as the raster codec.
 * @returns The flattened, encoded image buffer.
 *
 * @example
 * ```ts
 * import { compositeImage } from '@molecule/api-image-compositor'
 *
 * const png = await compositeImage(
 *   {
 *     width: 800,
 *     height: 600,
 *     background: '#ffffff',
 *     layers: [
 *       { kind: 'fill', color: 'rgba(0,0,255,0.5)',
 *         position: { x: 0, y: 0, width: 800, height: 600 } },
 *       { kind: 'image', src: pngBuffer,
 *         position: { x: 100, y: 80, width: 600, height: 400 },
 *         opacity: 0.85, blendMode: 'multiply' },
 *     ],
 *   },
 *   { format: 'png' },
 * )
 * ```
 */
export async function compositeImage(
  doc: LayeredImage,
  options: CompositeOptions = {},
  deps: CompositorDependencies = {},
): Promise<Buffer> {
  const raster = deps.raster ?? getRasterCodec()
  const format: CompositeFormat = options.format ?? 'png'

  let flat = await compositeRgba(doc, raster)

  if (options.resize) {
    const targetWidth = options.resize.width ?? flat.width
    const targetHeight = options.resize.height ?? flat.height
    if (targetWidth !== flat.width || targetHeight !== flat.height) {
      flat = await raster.resizeRaw(flat, targetWidth, targetHeight)
    }
  }

  return raster.encode(flat, format, options.quality)
}
