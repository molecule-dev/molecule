/**
 * QrCode component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'
import qrcode from 'qrcode-generator'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { buildQrPath } from './path.js'
import type { QrCodeLogo, QrCodeProps } from './types.js'

/** The module matrix geometry of one render. */
interface QrGeometry {
  /** Module count plus the quiet zone on both sides. */
  total: number
  /** SVG path `d` for the dark modules. */
  path: string
}

/**
 * Next value of the module-wide QR-code description id counter.
 *
 * React derives the `<desc>` id from `useId()`, which numbers ids from one
 * process-wide counter; the SVG's `aria-describedby` names the `<desc>` by it,
 * so the port generates ids from the same kind of counter — unique per
 * instance.
 */
let nextDescId = 0

/**
 * QrCode component.
 *
 * Render a QR code as a crisp, scalable SVG. Accepts any string value (URL,
 * redemption code, ticket token, ballot link, etc.) and optionally overlays a
 * small center logo. The host IS the `<svg>` (`svg[mol-qr-code]`), matching
 * React's root exactly — same attributes, same classes.
 *
 * Styling routes through `@molecule/app-ui`'s `getClassMap()`; the only inline
 * color attributes are the SVG `fill`s on the background rect and the
 * dark-modules path (real SVG attributes — not Tailwind classes). Those two
 * colours are data, not theme: a QR code must be dark modules on a light
 * background whatever the theme (scanners need the contrast), so the
 * `#fff`/`#000` fallbacks stay literal. The aria-label is read through
 * `useTranslation()` so a locale switch refreshes it.
 *
 * This is the Angular counterpart of `@molecule/app-qr-code-react`: the same
 * props (React names, bound as inputs) and the same DOM for the same input.
 */
@Component({
  selector: 'svg[mol-qr-code]',
  standalone: true,
  inputs: [
    'value',
    'size',
    'errorCorrection',
    'fgColor',
    'bgColor',
    'margin',
    'logo',
    'ariaLabel',
    'className',
  ],
  host: {
    role: 'img',
    '[attr.width]': 'svgSize()',
    '[attr.height]': 'svgSize()',
    '[attr.viewBox]': 'viewBox()',
    '[attr.aria-label]': 'label()',
    '[attr.aria-describedby]': 'description() ? descId : null',
    '[attr.data-mol-id]': '"qr-code"',
    '[class]': 'classes()',
    '[attr.shape-rendering]': '"crispEdges"',
  },
  template: `@let geometry = qrGeometry();
    @if (description()) {
      <svg:desc [attr.id]="descId">{{ description() }}</svg:desc>
    }
    <svg:rect
      x="0"
      y="0"
      [attr.width]="geometry.total"
      [attr.height]="geometry.total"
      [attr.fill]="bgColor ?? '#fff'"
      data-mol-id="qr-code-bg"
    ></svg:rect>
    <svg:path
      [attr.d]="geometry.path"
      [attr.fill]="fgColor ?? '#000'"
      data-mol-id="qr-code-modules"
    ></svg:path>
    @if (logo) {
      <svg:image
        [attr.href]="logo.src"
        [attr.x]="logoOffset()"
        [attr.y]="logoOffset()"
        [attr.width]="logoModuleSize()"
        [attr.height]="logoModuleSize()"
        [attr.preserveAspectRatio]="'xMidYMid meet'"
        data-mol-id="qr-code-logo"
      ></svg:image>
    }`,
})
export class QrCode {
  /** String value to encode (URL, ticket id, ballot link, etc.). */
  value?: string
  /** Output SVG width/height in pixels (defaults to 200 at read time). */
  size?: number
  /** Error-correction level (defaults to `'M'` at read time). */
  errorCorrection?: QrCodeProps['errorCorrection']
  /**
   * Foreground (dark module) color (defaults to `'#000'` at read time). Data,
   * not theme: a QR code must be dark modules on a light background whatever
   * the theme, because scanners need that contrast.
   */
  fgColor?: string
  /**
   * Background color (defaults to `'#fff'` at read time). Data, for the same
   * reason as {@link QrCode.fgColor}.
   */
  bgColor?: string
  /** Quiet-zone margin in modules (defaults to 2 at read time). */
  margin?: number
  /** Optional center logo overlay. */
  logo?: QrCodeLogo
  /** Override the auto-generated aria-label. */
  ariaLabel?: string
  /** Extra classes merged onto the SVG root via `cm.cn`. */
  className?: string

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /** The `<desc>` id of this instance (React's `useId()` equivalent). */
  readonly descId = `qr-code-desc-${nextDescId++}`

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The rendered size in pixels (React's `size = 200` default).
   * @returns The width and height.
   */
  svgSize(): number {
    return this.size ?? 200
  }

  /**
   * The quiet-zone margin in modules (React's `margin = 2` default).
   * @returns The margin.
   */
  marginValue(): number {
    return this.margin ?? 2
  }

  /**
   * Builds the module matrix and its dark-module path for the current props.
   * @returns The total module count and the SVG path.
   */
  qrGeometry(): QrGeometry {
    // typeNumber=0 lets the library pick the smallest type that fits.
    const qr = qrcode(0, this.errorCorrection ?? 'M')
    qr.addData(this.value ?? '')
    qr.make()
    const moduleCount = qr.getModuleCount()
    const margin = this.marginValue()
    return { total: moduleCount + margin * 2, path: buildQrPath(qr, margin) }
  }

  /**
   * The SVG viewBox for the current geometry.
   * @returns The viewBox value.
   */
  viewBox(): string {
    const total = this.qrGeometry().total
    return `0 0 ${total} ${total}`
  }

  /**
   * The accessible label (React's `ariaLabel ?? t('qrCode.aria.label')`).
   * @returns The aria label.
   */
  label(): string {
    return (
      this.ariaLabel ??
      this.i18n.t(
        'qrCode.aria.label',
        { value: this.value ?? '' },
        { defaultValue: 'QR code for {{value}}' },
      )
    )
  }

  /**
   * The logo's alt text as the QR code's accessible description. The logo
   * image itself is decorative (`<image>` inside the `role="img"` SVG is
   * presentational, so its own label is never read): the text becomes the
   * SVG's `<desc>`, named by `aria-describedby`.
   * @returns The description, or `undefined` when the logo has no alt text.
   */
  description(): string | undefined {
    return this.logo?.alt ? this.logo.alt : undefined
  }

  /**
   * The logo's width/height in viewBox (module) units — its pixel size
   * relative to `size`, or ~20% of the matrix by default.
   * @returns The logo size in module units.
   */
  logoModuleSize(): number {
    const total = this.qrGeometry().total
    return this.logo?.size ? (this.logo.size / this.svgSize()) * total : total * 0.2
  }

  /**
   * The logo's top-left corner in viewBox units (centered).
   * @returns The logo offset in module units.
   */
  logoOffset(): number {
    return (this.qrGeometry().total - this.logoModuleSize()) / 2
  }

  /**
   * Computes the wrapper class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.className)
  }
}
