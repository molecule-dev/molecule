import { Component } from '@angular/core'

/**
 * GitHub Octocat brand mark.
 *
 * Brand guideline: monochrome only — no brand color, so `mode` is ignored
 * (always uses `currentColor`). Typical placement: against a dark or
 * neutral background.
 *
 * The host IS the `<svg>` (`svg[mol-github-logo]`), matching React's root.
 * Defaults apply when an input is never bound OR is bound `undefined`
 * (React's absent-prop default).
 */
@Component({
  selector: 'svg[mol-github-logo]',
  standalone: true,
  inputs: ['size', 'className', 'mode', 'ariaLabel', 'title'],
  host: {
    xmlns: 'http://www.w3.org/2000/svg',
    translate: 'no',
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
      d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
    />`,
})
export class GitHubLogo {
  /** Rendered size in pixels (both width and height). */
  size: number | undefined = 20
  /** Optional className on the outer SVG element. */
  className?: string
  /** Accessible label; `''` marks the logo `aria-hidden`. */
  ariaLabel: string | undefined = 'GitHub'
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
    return this.ariaLabel ?? 'GitHub'
  }
}
