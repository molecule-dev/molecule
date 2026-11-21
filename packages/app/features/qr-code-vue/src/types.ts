/**
 * Types of `@molecule/app-qr-code-vue` — the Vue counterpart of
 * `@molecule/app-qr-code-react`, with the same prop names and shapes.
 *
 * @module
 */

/** QR error-correction level. `L` ≈ 7%, `M` ≈ 15%, `Q` ≈ 25%, `H` ≈ 30%. */
export type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

/** Optional center-logo overlay descriptor. */
export interface QrCodeLogo {
  /** Image URL or data URI to render in the center of the QR code. */
  src: string
  /**
   * Pixel size of the (square) logo. Defaults to 20% of `size`. Caller is
   * responsible for keeping the logo small enough that the code still scans;
   * use `errorCorrection='H'` when overlaying a logo.
   */
  size?: number
  /**
   * Accessible description of the QR code. The logo image itself is
   * decorative (`<image>` sits inside the `role="img"` SVG, whose children are
   * presentational, so its own label would never be read): when this is set,
   * the text becomes the SVG's `<desc>`, named by the SVG's
   * `aria-describedby`. Omit it for a purely decorative logo.
   */
  alt?: string
}

/** QrCode component props. */
export interface QrCodeProps {
  /** String value to encode (URL, ticket id, ballot link, etc.). */
  value: string
  /** Output SVG width/height in pixels. Defaults to 200. */
  size?: number
  /** Error-correction level. Defaults to `'M'`. Use `'H'` if overlaying a logo. */
  errorCorrection?: QrErrorCorrectionLevel
  /**
   * Foreground (dark module) color. Defaults to `'#000'`. Data, not theme: a QR
   * code must be dark modules on a light background whatever the theme, because
   * scanners need that contrast.
   */
  fgColor?: string
  /**
   * Background color. Defaults to `'#fff'`. Data, for the same reason as
   * {@link QrCodeProps.fgColor}.
   */
  bgColor?: string
  /** Quiet-zone margin in modules. Defaults to 2. */
  margin?: number
  /** Optional center logo overlay. */
  logo?: QrCodeLogo
  /**
   * Override the auto-generated `aria-label`. The default is the translated
   * `qrCode.aria.label` key with `{{value}}` interpolated.
   */
  ariaLabel?: string
  /** Extra classes merged onto the SVG root via `cm.cn`. */
  className?: string
}
