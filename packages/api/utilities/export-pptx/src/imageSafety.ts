/**
 * Image-format safety guard for deck export.
 *
 * `pptxgenjs` measures every embedded image with `image-size`, whose ICNS, JXL
 * and HEIF parsers each contain an infinite loop reachable from crafted input
 * (GHSA-w3rx-r6r6-pgpr, GHSA-5p2g-fcmc-qvqq). Both advisories are UNPATCHED —
 * every published `image-size` through 2.0.2 is affected — so there is no
 * version to upgrade to and no override that resolves them.
 *
 * What IS available is reachability. A deck exporter has no reason to accept
 * those three container formats: PowerPoint renders PNG/JPEG/GIF/BMP/SVG/WebP,
 * and ICNS (a macOS icon bundle), JXL and HEIF are not usable slide media in
 * practice. Refusing them at the boundary means the vulnerable parsers are never
 * handed input through this package — the DoS stops being reachable rather than
 * being merely documented.
 *
 * Declared type is not trusted on its own: a caller can label HEIF bytes
 * `image/png`. Buffers and data URIs are therefore sniffed by magic number, and
 * only `src` (a URL or path whose bytes we never see) falls back to its
 * extension — noted as a known limit rather than papered over.
 *
 * @module
 */

/** Formats whose `image-size` parsers are vulnerable. Deny, do not sanitize. */
const BLOCKED = [
  { id: 'icns', label: 'ICNS (macOS icon bundle)' },
  { id: 'jxl', label: 'JPEG XL' },
  { id: 'heif', label: 'HEIF/HEIC' },
] as const

type BlockedId = (typeof BLOCKED)[number]['id']

const labelFor = (id: BlockedId): string => BLOCKED.find((b) => b.id === id)?.label ?? id

/** HEIF-family brands that appear at bytes 8..12 of an ISOBMFF `ftyp` box. */
const HEIF_BRANDS = ['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'mif1', 'msf1']

/**
 * Identify a blocked format from the leading bytes, or `null` when the buffer is
 * not one of them. Reads magic numbers only — never parses the image.
 *
 * @param bytes - The start of the image payload (64 bytes is ample).
 * @returns The blocked format id, or `null` when nothing matches.
 */
export function sniffBlockedFormat(bytes: Uint8Array): BlockedId | null {
  if (bytes.length >= 4) {
    // ICNS: literal 'icns' magic at offset 0.
    if (bytes[0] === 0x69 && bytes[1] === 0x63 && bytes[2] === 0x6e && bytes[3] === 0x73) {
      return 'icns'
    }
    // JPEG XL, naked codestream: FF 0A.
    if (bytes[0] === 0xff && bytes[1] === 0x0a) return 'jxl'
  }
  if (bytes.length >= 12) {
    const box = String.fromCharCode(bytes[4]!, bytes[5]!, bytes[6]!, bytes[7]!)
    const brand = String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!)
    if (box === 'ftyp') {
      // JPEG XL in an ISOBMFF container shares the ftyp box with HEIF.
      if (brand === 'jxl ') return 'jxl'
      if (HEIF_BRANDS.includes(brand)) return 'heif'
    }
  }
  return null
}

/** Blocked format implied by a MIME type or file extension, if any. */
export function blockedFormatFromLabel(label: string | undefined): BlockedId | null {
  if (!label) return null
  const l = label.toLowerCase()
  if (/(^|[./])icns\b/.test(l) || l.includes('image/x-icns')) return 'icns'
  if (/(^|[./])jxl\b/.test(l) || l.includes('image/jxl')) return 'jxl'
  if (/(^|[./])(heic|heif)\b/.test(l) || l.includes('image/heic') || l.includes('image/heif')) {
    return 'heif'
  }
  return null
}

/**
 * Throw when an image is in a format whose measurement parser is vulnerable.
 *
 * @param input - What is known about the image: raw bytes when available, plus
 *   any declared MIME type and source path/URL.
 * @throws {Error} Naming the format and why it is refused.
 */
export function assertSafeImageFormat(input: {
  bytes?: Uint8Array
  mimeType?: string
  src?: string
}): void {
  const found =
    (input.bytes ? sniffBlockedFormat(input.bytes) : null) ??
    blockedFormatFromLabel(input.mimeType) ??
    blockedFormatFromLabel(input.src)
  if (!found) return
  throw new Error(
    `Unsupported image format: ${labelFor(found)}. Deck export refuses it because the ` +
      `image measurement library has an unpatched denial-of-service flaw in that parser ` +
      `(GHSA-w3rx-r6r6-pgpr, GHSA-5p2g-fcmc-qvqq). Convert the image to PNG or JPEG.`,
  )
}
