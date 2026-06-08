import qrcode from 'qrcode-generator'
import type { JSX } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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
  /** Alt text for the logo image (decorative if omitted). */
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
  /** Foreground (dark module) color. Defaults to `'#000'`. */
  fgColor?: string
  /** Background color. Defaults to `'#fff'`. */
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

/**
 * Build the contiguous-run path data for the dark modules in a QR matrix. We
 * collapse horizontal runs of dark modules into a single `M h Z` instruction
 * per run, which is dramatically smaller than per-module rectangles while
 * still rendering pixel-perfect.
 *
 * @param qr - The fully-built QR code object.
 * @param margin - Quiet-zone margin in modules.
 * @returns SVG path `d` attribute string.
 */
export function buildQrPath(
  qr: { getModuleCount: () => number; isDark: (row: number, col: number) => boolean },
  margin: number,
): string {
  const moduleCount = qr.getModuleCount()
  const segments: string[] = []
  for (let row = 0; row < moduleCount; row++) {
    let col = 0
    while (col < moduleCount) {
      if (qr.isDark(row, col)) {
        const runStart = col
        while (col < moduleCount && qr.isDark(row, col)) col++
        const runLen = col - runStart
        segments.push(`M${runStart + margin} ${row + margin}h${runLen}v1h-${runLen}z`)
      } else {
        col++
      }
    }
  }
  return segments.join('')
}

/**
 * Render a QR code as a crisp, scalable SVG. Accepts any string value
 * (URL, redemption code, ticket token, ballot link, etc.) and optionally
 * overlays a small center logo.
 *
 * Styling routes through `@molecule/app-ui`'s `getClassMap()` for the
 * container; the only inline color attributes are the SVG `fill`s on the
 * background rect and the dark-modules path (real SVG attributes — not
 * Tailwind classes). Translations come from `@molecule/app-locales-qr-code`.
 *
 * Used by coupon-deals-platform (redemption codes), restaurant-ordering
 * (table tokens), event-ticketing (tickets), voting-polling (ballot links).
 *
 * @param root0 - Component props.
 * @param root0.value - String value to encode.
 * @param root0.size - SVG width/height in pixels.
 * @param root0.errorCorrection - QR error-correction level.
 * @param root0.fgColor - Foreground (dark module) color.
 * @param root0.bgColor - Background color.
 * @param root0.margin - Quiet-zone margin in modules.
 * @param root0.logo - Optional center-logo overlay.
 * @param root0.ariaLabel - Override accessible label.
 * @param root0.className - Extra classes merged onto the SVG root.
 * @returns The QR code SVG element.
 */
export function QrCode({
  value,
  size = 200,
  errorCorrection = 'M',
  fgColor = '#000',
  bgColor = '#fff',
  margin = 2,
  logo,
  ariaLabel,
  className,
}: QrCodeProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()

  // typeNumber=0 lets the library pick the smallest type that fits.
  const qr = qrcode(0, errorCorrection)
  qr.addData(value)
  qr.make()

  const moduleCount = qr.getModuleCount()
  const totalModules = moduleCount + margin * 2
  const pathData = buildQrPath(qr, margin)

  const label =
    ariaLabel ?? t('qrCode.aria.label', { value }, { defaultValue: 'QR code for {{value}}' })

  // Logo geometry computed in viewBox (module) units so it scales with the
  // QR matrix regardless of `size`. Default to ~20% of the matrix.
  const logoModuleSize = logo?.size ? (logo.size / size) * totalModules : totalModules * 0.2
  const logoOffset = (totalModules - logoModuleSize) / 2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${totalModules} ${totalModules}`}
      role="img"
      aria-label={label}
      data-mol-id="qr-code"
      className={cm.cn(className)}
      shapeRendering="crispEdges"
    >
      <rect
        x={0}
        y={0}
        width={totalModules}
        height={totalModules}
        fill={bgColor}
        data-mol-id="qr-code-bg"
      />
      <path d={pathData} fill={fgColor} data-mol-id="qr-code-modules" />
      {logo ? (
        <image
          href={logo.src}
          x={logoOffset}
          y={logoOffset}
          width={logoModuleSize}
          height={logoModuleSize}
          preserveAspectRatio="xMidYMid meet"
          data-mol-id="qr-code-logo"
          aria-label={logo.alt}
        />
      ) : null}
    </svg>
  )
}
