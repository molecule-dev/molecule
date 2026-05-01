import { buildMatrix } from './buildMatrix.js'
import { renderPng } from './renderPng.js'
import { renderSvg } from './renderSvg.js'
import type { GenerateQrCodeOptions } from './types.js'

/**
 * Generate a QR code in the requested format.
 *
 * - `format: 'svg'` returns an SVG markup string.
 * - `format: 'png'` returns a PNG `Buffer` (hand-rolled, no native dep).
 * - `format: 'dataUrl'` returns a `data:image/svg+xml;base64,...` string
 *   suitable for direct inclusion in `<img src>` (HTML emails, PDFs).
 *
 * @param value - String to encode (URL, ticket id, redemption code, etc.).
 * @param options - Optional output controls (format, size, error correction, colors).
 * @returns SVG / data-URL string, or PNG `Buffer`.
 *
 * @example
 * ```ts
 * import { generateQrCode } from '@molecule/api-qr-code'
 *
 * const svg = await generateQrCode('https://example.com')
 * const png = await generateQrCode('TICKET-1234', { format: 'png', size: 256 })
 * const dataUrl = await generateQrCode('coupon-redeem-9z', { format: 'dataUrl' })
 * // <img src={dataUrl} /> — works in HTML emails.
 * ```
 */
export async function generateQrCode(
  value: string,
  options: GenerateQrCodeOptions = {},
): Promise<Buffer | string> {
  const {
    format = 'svg',
    size = 200,
    errorCorrection = 'M',
    margin = 2,
    fgColor = '#000',
    bgColor = '#fff',
  } = options

  const matrix = buildMatrix(value, errorCorrection, margin)

  if (format === 'svg') {
    return renderSvg(matrix, { size, fgColor, bgColor })
  }
  if (format === 'png') {
    return renderPng(matrix, { size, fgColor, bgColor })
  }
  if (format === 'dataUrl') {
    const svg = renderSvg(matrix, { size, fgColor, bgColor })
    const base64 = Buffer.from(svg, 'utf8').toString('base64')
    return `data:image/svg+xml;base64,${base64}`
  }
  throw new Error(`Unsupported format: ${String(format)}. Expected 'svg' | 'png' | 'dataUrl'.`)
}
