import { Component } from '@angular/core'

/**
 * X (formerly Twitter) brand mark. Monochrome only per X brand
 * guidelines; `mode` is ignored — always uses `currentColor`.
 *
 * Use either `<TwitterLogo/>` or `<XLogo/>` — they render the same SVG.
 * (`XLogo` is the same exported class.)
 *
 * The host IS the `<svg>` (`svg[mol-twitter-logo]`), matching React's root.
 * Defaults apply when an input is never bound OR is bound `undefined`
 * (React's absent-prop default).
 */
@Component({
  selector: 'svg[mol-twitter-logo]',
  standalone: true,
  inputs: ['size', 'className', 'mode', 'ariaLabel', 'title'],
  host: {
    xmlns: 'http://www.w3.org/2000/svg',
    fill: 'currentColor',
    viewBox: '0 0 24 24',
    '[attr.width]': 'attrSize()',
    '[attr.height]': 'attrSize()',
    '[attr.role]': 'label() ? "img" : null',
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': 'label() ? null : "true"',
    '[class]': 'className',
  },
  template: `@if (title) {
      <svg:title>{{ title }}</svg:title>
    }
    <svg:path
      d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
    />`,
})
export class TwitterLogo {
  /** Rendered size in pixels (both width and height). */
  size: number | undefined = 20
  /** Optional className on the outer SVG element. */
  className?: string
  /** Accessible label; `''` marks the logo `aria-hidden`. */
  ariaLabel: string | undefined = 'X (Twitter)'
  /**
   * Accepted for prop parity (`OAuthLogoProps.mode`); this mark is
   * monochrome only, so `mode` is ignored — the same prop React
   * destructures away.
   */
  mode?: 'brand' | 'mono'
  /** Optional title rendered as `<title>` for hover tooltips. */
  title?: string

  /**
   * The rendered size (the default applies when a binding writes
   * `undefined` over the field default, matching React's absent-prop default).
   * @returns The pixel size.
   */
  attrSize(): number {
    return this.size ?? 20
  }

  /**
   * The accessible label (React's default when the input was never set).
   * @returns The label text.
   */
  label(): string {
    return this.ariaLabel ?? 'X (Twitter)'
  }
}

/**
 * Alias of `TwitterLogo` — use the provider id that matches your OAuth config.
 */
export const XLogo = TwitterLogo
