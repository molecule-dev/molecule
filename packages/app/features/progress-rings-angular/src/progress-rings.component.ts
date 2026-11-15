/**
 * ProgressRings component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { ProgressRing, ProgressRingsProps } from './types.js'

/**
 * ProgressRings component.
 *
 * Apple-Health-style concentric SVG progress rings — a single circular ring
 * for one entry, or a nested stack (outermost first) for 2+. The host IS the
 * `<svg>` (`svg[mol-progress-rings]`), matching React's root exactly — same
 * attributes, same classes. Layout resolves via the wired ClassMap; ring
 * colors come from the `rings` input. The stack renders with `track $index`,
 * matching React's per-ring keys, so equal new data keeps the rendered nodes.
 *
 * This is the Angular counterpart of `@molecule/app-progress-rings-react`.
 */
@Component({
  selector: 'svg[mol-progress-rings]',
  standalone: true,
  inputs: [
    'rings',
    'size',
    'strokeWidth',
    'gap',
    'cornerRadius',
    'className',
    'dataMolId',
    'ariaLabel',
  ],
  host: {
    role: 'img',
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? "progress-rings"',
    '[attr.aria-label]': 'summary()',
    '[attr.width]': 'svgSize()',
    '[attr.height]': 'svgSize()',
    '[attr.viewBox]': 'viewBox()',
  },
  // prettier-ignore
  template: `@for (ring of rings; track $index) {@if (radius($index) > 0) {<svg:g role="img" [attr.aria-label]="ringLabel($index, ring.label)"><svg:circle [attr.cx]="center()" [attr.cy]="center()" [attr.r]="radius($index)" fill="none" [attr.stroke]="ring.color" [attr.stroke-opacity]="0.18" [attr.stroke-width]="strokeWidthValue()" /><svg:circle [attr.cx]="center()" [attr.cy]="center()" [attr.r]="radius($index)" fill="none" [attr.stroke]="ring.color" [attr.stroke-width]="strokeWidthValue()" [attr.stroke-linecap]="cornerRadiusValue()" [attr.stroke-dasharray]="dasharray($index)" [attr.transform]="transform()" /></svg:g>}}`,
})
export class ProgressRings {
  /** One or more rings. 1 ring = single circle; 2+ = concentric stack. */
  rings: ProgressRing[] = []
  /** Outer SVG diameter in px (defaults to 160 at read time). */
  size?: number
  /** Stroke thickness for each ring in px (defaults to 12 at read time). */
  strokeWidth?: number
  /** Gap between concentric rings in px (defaults to 4 at read time). */
  gap?: number
  /** Stroke linecap rounding (defaults to `'round'` at read time). */
  cornerRadius?: ProgressRingsProps['cornerRadius']
  /** Override the outer wrapper classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Optional aria-label for the whole graphic. */
  ariaLabel?: string

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the SVG's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.className)
  }

  /**
   * The SVG diameter (React's default parameter: a later-bound write of
   * `undefined` must not erase the `160` default).
   * @returns The size in px.
   */
  svgSize(): number {
    return this.size ?? 160
  }

  /**
   * The stroke thickness (React's default parameter).
   * @returns The stroke width in px.
   */
  strokeWidthValue(): number {
    return this.strokeWidth ?? 12
  }

  /**
   * The gap between rings (React's default parameter).
   * @returns The gap in px.
   */
  gapValue(): number {
    return this.gap ?? 4
  }

  /**
   * The stroke linecap (React's default parameter).
   * @returns `'round'` or `'butt'`.
   */
  cornerRadiusValue(): 'round' | 'butt' {
    return this.cornerRadius ?? 'round'
  }

  /**
   * The centre of the viewBox (also the circle centre on both axes).
   * @returns The centre in px.
   */
  center(): number {
    return this.svgSize() / 2
  }

  /**
   * The viewBox of the SVG.
   * @returns The `min-x min-y width height` string.
   */
  viewBox(): string {
    return `0 0 ${this.svgSize()} ${this.svgSize()}`
  }

  /**
   * The accessible summary (an explicit `ariaLabel` wins over the translated one).
   * @returns The aria label text.
   */
  summary(): string {
    return (
      this.ariaLabel ??
      this.i18n.t(
        'progressRings.summary',
        { count: this.rings.length },
        {
          defaultValue: 'Progress rings ({{count}} rings)',
        },
      )
    )
  }

  /**
   * The ring's accessible label (an explicit per-ring `label` wins).
   * @param i - Ring index (0 = outermost).
   * @param label - The ring's own label, when it has one.
   * @returns The label text.
   */
  ringLabel(i: number, label: string | undefined): string {
    return (
      label ??
      this.i18n.t('progressRings.ring', { index: i + 1 }, { defaultValue: 'Ring {{index}}' })
    )
  }

  /**
   * The ring's radius — rings nest inside-out, each one (strokeWidth + gap)
   * inward of the previous. React renders nothing for a radius <= 0.
   * @param i - Ring index (0 = outermost).
   * @returns The radius in px.
   */
  radius(i: number): number {
    return (
      this.svgSize() / 2 -
      this.strokeWidthValue() / 2 -
      i * (this.strokeWidthValue() + this.gapValue())
    )
  }

  /**
   * The ring's circumference (0 when the radius is not positive).
   * @param i - Ring index (0 = outermost).
   * @returns The circumference in px.
   */
  circumference(i: number): number {
    return 2 * Math.PI * Math.max(this.radius(i), 0)
  }

  /**
   * The filled arc length: the circumference times the clamped value ratio.
   * @param i - Ring index (0 = outermost).
   * @returns The filled length in px.
   */
  filledLength(i: number): number {
    const ring = this.rings[i]
    if (!ring) return 0
    const safeMax = ring.max > 0 ? ring.max : 1
    const ratio = Math.max(0, Math.min(1, ring.value / safeMax))
    return this.circumference(i) * ratio
  }

  /**
   * The arc's `stroke-dasharray` (filled length, then the whole circumference).
   * @param i - Ring index (0 = outermost).
   * @returns The dasharray value.
   */
  dasharray(i: number): string {
    return `${this.filledLength(i)} ${this.circumference(i)}`
  }

  /**
   * The arc's rotation, so it starts at the top of the circle.
   * @returns The transform value.
   */
  transform(): string {
    return `rotate(-90 ${this.center()} ${this.center()})`
  }
}
