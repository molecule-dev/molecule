import { deflateSync } from 'node:zlib'

import type { QrMatrix } from './buildMatrix.js'

/**
 * Options for {@link renderPng}.
 */
export interface RenderPngOptions {
  /** Output width/height in pixels. */
  size: number
  /** Foreground (dark module) color. */
  fgColor: string
  /** Background color. */
  bgColor: string
}

/**
 * Render a QR matrix as PNG bytes. Hand-rolled (no native dependency) so the
 * package stays portable across Node versions and Linux distributions.
 *
 * The image is emitted at the natural pixel-per-module resolution closest to
 * `size`: each module is scaled up to `floor(size / totalModules)` pixels (≥ 1).
 * The resulting image is then padded with the background color to reach the
 * requested `size × size` so callers always get back the dimensions they
 * asked for.
 *
 * @param matrix - Built QR matrix from {@link buildMatrix}.
 * @param options - Output size + colors.
 * @returns PNG byte buffer.
 */
export function renderPng(matrix: QrMatrix, options: RenderPngOptions): Buffer {
  const { size, fgColor, bgColor } = options
  if (size <= 0 || !Number.isFinite(size)) {
    throw new Error('size must be a positive finite number')
  }
  const totalModules = matrix.moduleCount + matrix.margin * 2
  const moduleSize = Math.max(1, Math.floor(size / totalModules))
  const drawnSize = moduleSize * totalModules
  const finalSize = Math.max(size, drawnSize)
  const padding = Math.floor((finalSize - drawnSize) / 2)

  const fg = parseColor(fgColor)
  const bg = parseColor(bgColor)

  // Build raw RGB pixel buffer (3 bytes per pixel). We pre-fill with the
  // background, then stamp each dark module as a `moduleSize × moduleSize`
  // block of foreground pixels.
  const stride = finalSize * 3
  const raw = Buffer.alloc(finalSize * stride)
  for (let y = 0; y < finalSize; y++) {
    const rowOffset = y * stride
    for (let x = 0; x < finalSize; x++) {
      const px = rowOffset + x * 3
      raw[px] = bg[0]
      raw[px + 1] = bg[1]
      raw[px + 2] = bg[2]
    }
  }
  for (let row = 0; row < matrix.moduleCount; row++) {
    for (let col = 0; col < matrix.moduleCount; col++) {
      if (!matrix.isDark(row, col)) continue
      const xStart = padding + (col + matrix.margin) * moduleSize
      const yStart = padding + (row + matrix.margin) * moduleSize
      for (let dy = 0; dy < moduleSize; dy++) {
        const rowOffset = (yStart + dy) * stride
        for (let dx = 0; dx < moduleSize; dx++) {
          const px = rowOffset + (xStart + dx) * 3
          raw[px] = fg[0]
          raw[px + 1] = fg[1]
          raw[px + 2] = fg[2]
        }
      }
    }
  }

  // Wrap the raw RGB buffer with PNG scanline filter bytes (one leading
  // 0x00 per row = "no filter") and compress with zlib for the IDAT chunk.
  const filtered = Buffer.alloc(finalSize * (stride + 1))
  for (let y = 0; y < finalSize; y++) {
    filtered[y * (stride + 1)] = 0
    raw.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idatData = deflateSync(filtered)

  return buildPng(finalSize, finalSize, idatData)
}

/**
 * 8-byte canonical PNG signature: 89 50 4E 47 0D 0A 1A 0A.
 */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/**
 * Concatenate the PNG signature + IHDR + IDAT + IEND chunks.
 *
 * @param width - Image width in pixels.
 * @param height - Image height in pixels.
 * @param idatData - Already-deflated scanline data.
 * @returns Complete PNG byte buffer.
 */
function buildPng(width: number, height: number, idatData: Buffer): Buffer {
  // IHDR — 13 bytes: width, height, bit depth (8), color type (2 = truecolor RGB),
  // compression (0), filter (0), interlace (0).
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: truecolor
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    PNG_SIGNATURE,
    encodeChunk('IHDR', ihdr),
    encodeChunk('IDAT', idatData),
    encodeChunk('IEND', Buffer.alloc(0)),
  ])
}

/**
 * Encode a single PNG chunk: 4-byte length + 4-byte type + data + 4-byte CRC.
 *
 * @param type - Four-character ASCII chunk type (e.g. `'IHDR'`).
 * @param data - Chunk payload bytes.
 * @returns Buffer containing the encoded chunk.
 */
function encodeChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([length, typeBuf, data, crcBuf])
}

/**
 * Lazily-built CRC-32 lookup table (IEEE 802.3 polynomial, reversed).
 */
let crcTable: Uint32Array | undefined

/**
 * Compute the CRC-32 checksum required by every PNG chunk.
 *
 * @param data - Bytes to checksum (chunk type + chunk data).
 * @returns Unsigned 32-bit CRC.
 */
function crc32(data: Buffer): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      }
      crcTable[n] = c
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    const tableValue = crcTable[(crc ^ data[i]!) & 0xff]!
    crc = tableValue ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Parse a CSS hex color string (`#rgb`, `#rrggbb`) into an RGB triplet.
 * Throws on any other format — callers needing arbitrary CSS color names
 * (`rgba(...)`, `hsl(...)`, named colors) should pre-resolve to hex.
 *
 * @param input - Hex color string.
 * @returns `[r, g, b]` with each component in 0..255.
 */
export function parseColor(input: string): [number, number, number] {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim())
  if (!match) {
    throw new Error(
      `Unsupported color: ${input}. Use 3- or 6-digit hex (e.g. "#000" or "#ff0000").`,
    )
  }
  let hex = match[1]!
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((ch) => ch + ch)
      .join('')
  }
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ]
}
