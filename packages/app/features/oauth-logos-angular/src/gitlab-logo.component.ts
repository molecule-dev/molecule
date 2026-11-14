import { Component } from '@angular/core'

/**
 * GitLab tanuki — official brand mark, normalized to a 24×24 viewBox.
 * `mode='mono'` renders a flat tanuki silhouette in `currentColor`.
 *
 * The host IS the `<svg>` (`svg[mol-gitlab-logo]`), matching React's root.
 * Defaults apply when an input is never bound OR is bound `undefined`
 * (React's absent-prop default).
 */
@Component({
  selector: 'svg[mol-gitlab-logo]',
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
    '[class]': 'className',
  },
  template: `@if (title) {
      <svg:title>{{ title }}</svg:title>
    }
    @if (isMono()) {
      <svg:path
        fill="currentColor"
        d="M23.955 13.587l-1.342-4.135-2.664-8.189a.455.455 0 0 0-.866 0L16.419 9.45H7.582L4.916 1.263a.455.455 0 0 0-.866 0L1.386 9.452.045 13.587a.928.928 0 0 0 .336 1.039L12 22.928l11.62-8.302a.928.928 0 0 0 .335-1.039z"
      />
    } @else {
      <svg:path fill="#E24329" d="M12 21.42l4.212-12.96H7.788z" />
      <svg:path fill="#FCA326" d="M12 21.42l-4.212-12.96H1.883z" />
      <svg:path fill="#E24329" d="M1.883 8.46L.605 12.39a.87.87 0 0 0 .316.972L12 21.42z" />
      <svg:path fill="#FC6D26" d="M1.883 8.46h5.905L5.25.639a.432.432 0 0 0-.82 0z" />
      <svg:path fill="#FCA326" d="M12 21.42l4.212-12.96h5.905z" />
      <svg:path fill="#E24329" d="M22.117 8.46l1.278 3.93a.87.87 0 0 1-.316.972L12 21.42z" />
      <svg:path fill="#FC6D26" d="M22.117 8.46h-5.905L18.75.639a.432.432 0 0 1 .82 0z" />
    }`,
})
export class GitLabLogo {
  /** Rendered size in pixels (both width and height). */
  size: number | undefined = 20
  /** Optional className on the outer SVG element. */
  className?: string
  /** Color mode: `'brand'` (default) or `'mono'` (`currentColor`). */
  mode: 'brand' | 'mono' | undefined = 'brand'
  /** Accessible label; `''` marks the logo `aria-hidden`. */
  ariaLabel: string | undefined = 'GitLab'
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
    return this.ariaLabel ?? 'GitLab'
  }
}
