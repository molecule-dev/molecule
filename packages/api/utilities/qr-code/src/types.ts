/**
 * Public types for `@molecule/api-qr-code`.
 *
 * Server-side QR code generation suitable for email templates (ticket QRs,
 * redemption codes), PDF inclusion, and push-notification icons. Companion
 * to the client-side `@molecule/app-qr-code-react` package.
 *
 * @module
 */

/**
 * QR error-correction level. Higher levels recover more damage at the cost
 * of denser modules.
 *
 * - `'L'` — ~7% recovery
 * - `'M'` — ~15% recovery (default)
 * - `'Q'` — ~25% recovery
 * - `'H'` — ~30% recovery (use when overlaying a logo)
 */
export type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

/**
 * Output format for {@link generateQrCode}.
 *
 * - `'svg'` — returns a UTF-8 SVG string.
 * - `'png'` — returns a `Buffer` containing PNG bytes.
 * - `'dataUrl'` — returns a `data:image/svg+xml;base64,...` string suitable
 *   for embedding directly in an `<img src>` attribute or HTML email.
 */
export type QrCodeFormat = 'svg' | 'png' | 'dataUrl'

/**
 * Options accepted by {@link generateQrCode}.
 */
export interface GenerateQrCodeOptions {
  /** Output format. Defaults to `'svg'`. */
  format?: QrCodeFormat
  /** Output width/height in pixels. Defaults to 200. */
  size?: number
  /** Error-correction level. Defaults to `'M'`. */
  errorCorrection?: QrErrorCorrectionLevel
  /** Quiet-zone margin in modules (the QR-code "pixels"). Defaults to 2. */
  margin?: number
  /** Foreground (dark module) color. Defaults to `'#000'`. */
  fgColor?: string
  /** Background color. Defaults to `'#fff'`. */
  bgColor?: string
}

/**
 * MIME type for SVG output.
 */
export const SVG_CONTENT_TYPE = 'image/svg+xml'

/**
 * MIME type for PNG output.
 */
export const PNG_CONTENT_TYPE = 'image/png'
