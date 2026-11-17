import { Component } from '@angular/core'

/**
 * LinkedIn brand mark. `mode='brand'` renders the blue square with
 * white "in"; `mode='mono'` renders a monochrome "in" glyph.
 *
 * The host IS the `<svg>` (`svg[mol-linkedin-logo]`), matching React's root.
 * Defaults apply when an input is never bound OR is bound `undefined`
 * (React's absent-prop default).
 */
@Component({
  selector: 'svg[mol-linkedin-logo]',
  standalone: true,
  inputs: ['size', 'className', 'mode', 'ariaLabel', 'title'],
  host: {
    xmlns: 'http://www.w3.org/2000/svg',
    translate: 'no',
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
        d="M6.94 5.00003C6.94 6.10463 6.04459 7.00004 4.94 7.00004C3.83541 7.00004 2.94 6.10463 2.94 5.00003C2.94 3.89543 3.83541 3.00003 4.94 3.00003C6.04459 3.00003 6.94 3.89543 6.94 5.00003ZM7 8.48003H3V21H7V8.48003ZM13.32 8.48003H9.34V21H13.28V14.43C13.28 10.77 18.05 10.43 18.05 14.43V21H22V13.07C22 6.90003 14.94 7.13003 13.28 10.16L13.32 8.48003Z"
      />
    } @else {
      <svg:path
        d="M20.452 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.356V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.02H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
        fill="#0A66C2"
      />
    }`,
})
export class LinkedInLogo {
  /** Rendered size in pixels (both width and height). */
  size: number | undefined = 20
  /** Optional className on the outer SVG element. */
  className?: string
  /** Color mode: `'brand'` (default) or `'mono'` (`currentColor`). */
  mode: 'brand' | 'mono' | undefined = 'brand'
  /** Accessible label; `''` marks the logo `aria-hidden`. */
  ariaLabel: string | undefined = 'LinkedIn'
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
    return this.ariaLabel ?? 'LinkedIn'
  }
}
