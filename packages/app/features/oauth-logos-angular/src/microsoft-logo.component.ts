import { Component } from '@angular/core'

/**
 * Microsoft 4-square brand mark. `mode='brand'` renders the four
 * official squares; `mode='mono'` renders a flat 2×2 grid in
 * `currentColor`.
 *
 * The host IS the `<svg>` (`svg[mol-microsoft-logo]`), matching React's root.
 * Defaults apply when an input is never bound OR is bound `undefined`
 * (React's absent-prop default).
 */
@Component({
  selector: 'svg[mol-microsoft-logo]',
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
    '[class]': 'className',
  },
  template: `@if (title) {
      <svg:title>{{ title }}</svg:title>
    }
    @if (isMono()) {
      <svg:rect x="2" y="2" width="9" height="9" fill="currentColor" />
      <svg:rect x="13" y="2" width="9" height="9" fill="currentColor" opacity="0.85" />
      <svg:rect x="2" y="13" width="9" height="9" fill="currentColor" opacity="0.75" />
      <svg:rect x="13" y="13" width="9" height="9" fill="currentColor" opacity="0.6" />
    } @else {
      <svg:rect x="2" y="2" width="9" height="9" fill="#F25022" />
      <svg:rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
      <svg:rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
      <svg:rect x="13" y="13" width="9" height="9" fill="#FFB900" />
    }`,
})
export class MicrosoftLogo {
  /** Rendered size in pixels (both width and height). */
  size: number | undefined = 20
  /** Optional className on the outer SVG element. */
  className?: string
  /** Color mode: `'brand'` (default) or `'mono'` (`currentColor`). */
  mode: 'brand' | 'mono' | undefined = 'brand'
  /** Accessible label; `''` marks the logo `aria-hidden`. */
  ariaLabel: string | undefined = 'Microsoft'
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
    return this.ariaLabel ?? 'Microsoft'
  }
}
