/**
 * Sparkline component (React parity).
 *
 * @module
 */

import { Component, ElementRef, inject, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeElementBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/** One rendered `<rect>` of the bar variant. */
interface BarSpec {
  /** Left edge, in px. */
  x: number
  /** Top edge, in px. */
  y: number
  /** Bar width, in px (at least 2). */
  width: number
  /** Bar height, in px. */
  height: number
}

/** One rendered `<circle>` of the dot variant. */
interface DotSpec {
  /** Center x, in px. */
  cx: number
  /** Center y, in px. */
  cy: number
}

/**
 * Sparkline component.
 *
 * Tiny inline trend chart — line, bar, or dot variants, SVG with no
 * external library. Same props, same DOM as
 * `@molecule/app-sparkline-react`'s `Sparkline`. React's root is the
 * `<svg>` when the series is non-empty and nothing when empty, so the
 * `<svg>` renders in front of the host and the host itself leaves the page
 * (`placeElementBefore` + `setElementPresent`, React's fragment root); the
 * series renders with `track $index`, matching React's per-item keys, so a
 * new array of equal values keeps the rendered nodes.
 */
@Component({
  selector: 'mol-sparkline',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['values', 'variant', 'width', 'height', 'color', 'ariaLabel', 'className'],
  template: `@if (hasValues) {
    <svg
      #root
      role="img"
      [attr.width]="svgWidth()"
      [attr.height]="svgHeight()"
      [attr.viewBox]="viewBox()"
      [attr.aria-label]="label()"
      [attr.class]="classes()"
    >
      @if (isLine()) {
        <polyline
          fill="none"
          [attr.stroke]="colorValue()"
          [attr.stroke-width]="1.5"
          [attr.points]="points()"
        />
      } @else if (isBar()) {
        @for (bar of bars(); track $index) {
          <rect
            [attr.x]="bar.x"
            [attr.y]="bar.y"
            [attr.width]="bar.width"
            [attr.height]="bar.height"
            [attr.fill]="colorValue()"
          />
        }
      } @else if (isDot()) {
        @for (dot of dots(); track $index) {
          <circle [attr.cx]="dot.cx" [attr.cy]="dot.cy" [attr.r]="1.5" [attr.fill]="colorValue()" />
        }
      }
    </svg>
  }`,
})
export class Sparkline {
  /** Numeric series — length determines the segment count. */
  values: number[] = []
  /** Visual variant. */
  variant?: 'line' | 'bar' | 'dot'
  /** SVG width in px. */
  width?: number
  /** SVG height in px. */
  height?: number
  /** Stroke / fill color. */
  color?: string
  /** Optional accessible label. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /** The `<svg>` — React's root while the series is non-empty. */
  @ViewChild('root') private root?: ElementRef<SVGSVGElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    // React's root is the `<svg>` itself (`values: []` renders nothing): it renders in
    // front of the host's place and the host leaves the page.
    usePlacement(() => {
      const root = this.root?.nativeElement
      if (root) placeElementBefore(root, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
    })
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Whether the series renders at all (React returns null for an empty one).
   * @returns True when `values` is non-empty.
   */
  get hasValues(): boolean {
    return this.values.length > 0
  }

  /**
   * The effective variant (React's default parameter: an absent or
   * later-bound write of `undefined` must not erase the `'line'` default).
   * @returns `'line'`, `'bar'` or `'dot'`.
   */
  variantValue(): 'line' | 'bar' | 'dot' {
    return this.variant ?? 'line'
  }

  /**
   * Whether the line variant renders.
   * @returns True for `'line'`.
   */
  isLine(): boolean {
    return this.variantValue() === 'line'
  }

  /**
   * Whether the bar variant renders.
   * @returns True for `'bar'`.
   */
  isBar(): boolean {
    return this.variantValue() === 'bar'
  }

  /**
   * Whether the dot variant renders.
   * @returns True for `'dot'`.
   */
  isDot(): boolean {
    return this.variantValue() === 'dot'
  }

  /**
   * The SVG width (React's default parameter).
   * @returns The width in px.
   */
  svgWidth(): number {
    return this.width ?? 80
  }

  /**
   * The SVG height (React's default parameter).
   * @returns The height in px.
   */
  svgHeight(): number {
    return this.height ?? 24
  }

  /**
   * The viewBox of the SVG.
   * @returns The `min-x min-y width height` string.
   */
  viewBox(): string {
    return `0 0 ${this.svgWidth()} ${this.svgHeight()}`
  }

  /**
   * The stroke / fill color (React's default parameter).
   * @returns The CSS color.
   */
  colorValue(): string {
    return this.color ?? 'currentColor'
  }

  /**
   * The accessible label (React's default parameter): the prop when given,
   * otherwise the translated default.
   * @returns The label text.
   */
  label(): string {
    return (
      this.ariaLabel ??
      this.i18n.t('sparkline.aria.trendSparkline', undefined, { defaultValue: 'Trend sparkline' })
    )
  }

  /**
   * Computes the SVG's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.className)
  }

  /**
   * The smallest value of the series.
   * @returns The minimum.
   */
  min(): number {
    return Math.min(...this.values)
  }

  /**
   * The largest value of the series.
   * @returns The maximum.
   */
  max(): number {
    return Math.max(...this.values)
  }

  /**
   * The normalized value range (1 for a constant series, so it renders along
   * the bottom edge instead of dividing by zero).
   * @returns `max - min`, or 1 when that is 0.
   */
  range(): number {
    return this.max() - this.min() || 1
  }

  /**
   * The horizontal distance between two points (0 for a single value).
   * @returns The x step.
   */
  stepX(): number {
    return this.values.length === 1 ? 0 : this.svgWidth() / (this.values.length - 1)
  }

  /**
   * The vertical pixel of a value: the bottom edge minus its normalized height.
   * @param v - The value.
   * @returns The y coordinate inside the viewBox.
   */
  y(v: number): number {
    return this.svgHeight() - ((v - this.min()) / this.range()) * this.svgHeight()
  }

  /**
   * The `<polyline>` points of the line variant.
   * @returns The `x,y` pairs, space-separated.
   */
  points(): string {
    return this.values.map((v, i) => `${i * this.stepX()},${this.y(v)}`).join(' ')
  }

  /**
   * The bar width (at least 2 px, so a wide series stays visible).
   * @returns The bar width in px.
   */
  barWidth(): number {
    return Math.max(2, this.svgWidth() / this.values.length - 2)
  }

  /**
   * The `<rect>` specs of the bar variant.
   * @returns One spec per value.
   */
  bars(): BarSpec[] {
    return this.values.map((v, i) => {
      const height = ((v - this.min()) / this.range()) * this.svgHeight()
      return {
        x: i * (this.barWidth() + 2),
        y: this.svgHeight() - height,
        width: this.barWidth(),
        height,
      }
    })
  }

  /**
   * The `<circle>` specs of the dot variant.
   * @returns One spec per value.
   */
  dots(): DotSpec[] {
    return this.values.map((v, i) => ({ cx: i * this.stepX(), cy: this.y(v) }))
  }
}
