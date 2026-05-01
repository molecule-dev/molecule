/**
 * Per-channel blend-mode kernels and the main RGBA pixel composer.
 *
 * Blend modes follow standard SVG / Canvas2D semantics. The kernels here
 * operate on a single 0–255 channel byte at a time; the alpha composite
 * itself is Porter-Duff "source over" (`over`).
 *
 * @module
 */

import { clamp } from './color.js'
import type { BlendMode } from './types.js'

/**
 * Blend the source channel `s` over the destination channel `d` per the
 * named blend mode. All inputs and outputs are 0–255 bytes.
 *
 * @param mode - Blend mode.
 * @param s - Source channel (0–255).
 * @param d - Destination channel (0–255).
 * @returns Blended channel value.
 */
export function blendChannel(mode: BlendMode, s: number, d: number): number {
  switch (mode) {
    case 'normal':
      return s
    case 'multiply':
      // (s * d) / 255
      return Math.round((s * d) / 255)
    case 'screen':
      // 255 − ((255 − s) * (255 − d) / 255)
      return Math.round(255 - ((255 - s) * (255 - d)) / 255)
    case 'overlay': {
      // d < 128 ? multiply : screen — symmetric to multiply/screen
      if (d < 128) {
        return Math.round((2 * s * d) / 255)
      }
      return Math.round(255 - (2 * (255 - s) * (255 - d)) / 255)
    }
  }
}

/**
 * Compose a single source pixel onto a single destination pixel using the
 * named blend mode + Porter-Duff source-over alpha compositing.
 *
 * Mutates `dst` in place at offset `dstOffset` and reads `src` at
 * `srcOffset`.
 *
 * @param mode - Blend mode for the RGB channels.
 * @param srcOpacity - Per-layer opacity multiplier in `[0, 1]`.
 * @param dst - Destination buffer.
 * @param dstOffset - Byte offset within `dst`.
 * @param src - Source buffer.
 * @param srcOffset - Byte offset within `src`.
 */
export function composePixel(
  mode: BlendMode,
  srcOpacity: number,
  dst: Buffer,
  dstOffset: number,
  src: Buffer,
  srcOffset: number,
): void {
  const sR = src[srcOffset]!
  const sG = src[srcOffset + 1]!
  const sB = src[srcOffset + 2]!
  const sAByte = src[srcOffset + 3]!

  const sA = (sAByte / 255) * clamp(srcOpacity, 0, 1)
  if (sA <= 0) return

  const dR = dst[dstOffset]!
  const dG = dst[dstOffset + 1]!
  const dB = dst[dstOffset + 2]!
  const dAByte = dst[dstOffset + 3]!
  const dA = dAByte / 255

  // Blended source RGB (still in 0–255 byte space)
  const bR = blendChannel(mode, sR, dR)
  const bG = blendChannel(mode, sG, dG)
  const bB = blendChannel(mode, sB, dB)

  // Porter-Duff "source over": outA = sA + dA*(1−sA)
  const outA = sA + dA * (1 - sA)
  if (outA <= 0) {
    dst[dstOffset] = 0
    dst[dstOffset + 1] = 0
    dst[dstOffset + 2] = 0
    dst[dstOffset + 3] = 0
    return
  }

  // Pre-multiplied source over for RGB:
  // outC = (bC*sA + dC*dA*(1−sA)) / outA
  const outR = (bR * sA + dR * dA * (1 - sA)) / outA
  const outG = (bG * sA + dG * dA * (1 - sA)) / outA
  const outB = (bB * sA + dB * dA * (1 - sA)) / outA

  dst[dstOffset] = clamp(Math.round(outR), 0, 255)
  dst[dstOffset + 1] = clamp(Math.round(outG), 0, 255)
  dst[dstOffset + 2] = clamp(Math.round(outB), 0, 255)
  dst[dstOffset + 3] = clamp(Math.round(outA * 255), 0, 255)
}
