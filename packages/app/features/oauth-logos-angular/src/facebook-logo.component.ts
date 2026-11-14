import { Component } from '@angular/core'

/**
 * Facebook "f" mark. `mode='brand'` renders the blue circle with white
 * "f"; `mode='mono'` renders a monochrome "f" in `currentColor`.
 *
 * The host IS the `<svg>` (`svg[mol-facebook-logo]`), matching React's root.
 * Defaults apply when an input is never bound OR is bound `undefined`
 * (React's absent-prop default).
 */
@Component({
  selector: 'svg[mol-facebook-logo]',
  standalone: true,
  inputs: ['size', 'className', 'mode', 'ariaLabel', 'title'],
  host: {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    '[attr.width]': 'attrSize()',
    '[attr.height]': 'attrSize()',
    '[attr.role]': 'label() ? "img" : null',
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': 'label() ? null : "true"',
    '[attr.fill]': 'isMono() ? "currentColor" : null',
    '[class]': 'className',
  },
  template: `@if (title) {
      <svg:title>{{ title }}</svg:title>
    }
    @if (isMono()) {
      <svg:path
        d="M13.397 20.997v-8.196h2.765l.411-3.209h-3.176V7.548c0-.926.258-1.56 1.587-1.56h1.684V3.127A22.336 22.336 0 0 0 14.201 3c-2.444 0-4.122 1.492-4.122 4.231v2.355H7.332v3.209h2.753v8.202h3.312z"
      />
    } @else {
      <svg:path
        d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46H15.19c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
        fill="#1877F2"
      />
      <svg:path
        d="M13.397 20.997v-8.196h2.765l.411-3.209h-3.176V7.548c0-.926.258-1.56 1.587-1.56h1.684V3.127A22.336 22.336 0 0 0 14.201 3c-2.444 0-4.122 1.492-4.122 4.231v2.355H7.332v3.209h2.753v8.202h3.312z"
        fill="#fff"
      />
    }`,
})
export class FacebookLogo {
  /** Rendered size in pixels (both width and height). */
  size: number | undefined = 20
  /** Optional className on the outer SVG element. */
  className?: string
  /** Color mode: `'brand'` (default) or `'mono'` (`currentColor`). */
  mode: 'brand' | 'mono' | undefined = 'brand'
  /** Accessible label; `''` marks the logo `aria-hidden`. */
  ariaLabel: string | undefined = 'Facebook'
  /** Optional title rendered as `<title>` for hover tooltips. */
  title?: string

  /**
   * Whether the mark renders in `currentColor` (the `'brand'` default
   * applies when a binding writes `undefined` over the field default).
   * @returns True when `mode` is `'mono'`.
   */
  isMono(): boolean {
    return (this.mode ?? 'brand') === 'mono'
  }

  /**
   * The rendered size (the default applies when a binding writes
   * `undefined` over the field default).
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
    return this.ariaLabel ?? 'Facebook'
  }
}
