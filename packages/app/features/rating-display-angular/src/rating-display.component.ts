/**
 * RatingDisplay component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/** Star pixel size per size preset. */
const SIZE_PX = { sm: 12, md: 16, lg: 20 } as const

/** The star's single SVG path, identical to React's. */
const STAR_PATH =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'

/** One star's computed render state. */
interface StarState {
  /** Star index (0-based). */
  i: number
  /** Star fill fraction (0–1). */
  fill: number
  /** The star's gradient id. */
  id: string
}

/**
 * Mints one star's gradient id, exactly as React's `Star` does.
 *
 * @returns The gradient id.
 */
const starId = (): string => `star-grad-${Math.random().toString(36).slice(2, 9)}`

/**
 * RatingDisplay component.
 *
 * Star-rating display supporting fractional values and an optional
 * review-count tail. When `onChange` is provided each star becomes an
 * interactive button. The host IS the outer `<span>`
 * (`span[mol-rating-display]`), matching React's root exactly, so the root's
 * class, `role` and `aria-label` are host bindings.
 *
 * Uses inline SVG stars so the component works without icon-font fallback.
 * Same props (React names) and same DOM as
 * `@molecule/app-rating-display-react`'s `RatingDisplay`.
 */
@Component({
  selector: 'span[mol-rating-display]',
  standalone: true,
  inputs: [
    'value',
    'max',
    'reviewCount',
    'onReviewsClick',
    'size',
    'onChange',
    'ariaLabel',
    'className',
  ],
  host: {
    role: 'img',
    '[class]': 'classes()',
    '[attr.aria-label]': 'label()',
  },
  template: `@for (star of stars(); track star.i) {
      @if (onChange) {
        <button type="button" (click)="select(star.i)" [attr.aria-label]="rateLabel(star.i)">
          <svg [attr.width]="px()" [attr.height]="px()" viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <linearGradient [attr.id]="star.id">
                <stop [attr.offset]="offset(star.fill)" stop-color="currentColor"></stop>
                <stop
                  [attr.offset]="offset(star.fill)"
                  stop-color="currentColor"
                  stop-opacity="0.25"
                ></stop>
              </linearGradient>
            </defs>
            <path [attr.d]="path" [attr.fill]="fillUrl(star.id)"></path>
          </svg>
        </button>
      } @else {
        <svg [attr.width]="px()" [attr.height]="px()" viewBox="0 0 24 24" aria-hidden="true">
          <defs>
            <linearGradient [attr.id]="star.id">
              <stop [attr.offset]="offset(star.fill)" stop-color="currentColor"></stop>
              <stop
                [attr.offset]="offset(star.fill)"
                stop-color="currentColor"
                stop-opacity="0.25"
              ></stop>
            </linearGradient>
          </defs>
          <path [attr.d]="path" [attr.fill]="fillUrl(star.id)"></path>
        </svg>
      }
    }
    @if (reviewCount !== undefined) {
      @if (onReviewsClick) {
        <button type="button" (click)="onReviewsClick($event)" [class]="reviewClasses()">
          ({{ reviewCount }})
        </button>
      } @else {
        <span [class]="textClasses()">({{ reviewCount }})</span>
      }
    }`,
})
export class RatingDisplay {
  /** Rating value (0–max). Fractional supported. */
  value!: number
  /** Maximum rating (defaults to 5 at read time). */
  max?: number
  /** Optional review count shown after the stars. */
  reviewCount?: number
  /** Called when the review-count is clicked; receives the DOM click event. */
  onReviewsClick?: (event?: MouseEvent) => void
  /** Size preset (defaults to `'md'` at read time). */
  size?: 'sm' | 'md' | 'lg'
  /** Interactive mode — star clicks call `onChange(starIndex + 1)`. */
  onChange?: (value: number) => void
  /** Accessible label override. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
  /** The star's single SVG path. */
  readonly path = STAR_PATH

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The effective maximum (React's default parameter: a later-bound write of
   * `undefined` must not erase the `5` default).
   * @returns The maximum rating.
   */
  maxValue(): number {
    return this.max ?? 5
  }

  /**
   * The star size in pixels (React's `SIZE_PX[size]`, which is `undefined` for
   * an unknown size so both axes are omitted).
   * @returns The pixel size.
   */
  px(): number | undefined {
    return SIZE_PX[this.size ?? 'md']
  }

  /**
   * One render state per star: its index, its fractional fill and its gradient
   * id (minted per render, as React mints one per star per render).
   * @returns The star states.
   */
  stars(): StarState[] {
    return Array.from({ length: this.maxValue() }, (_value, i) => ({
      i,
      fill: Math.max(0, Math.min(1, this.value - i)),
      id: starId(),
    }))
  }

  /**
   * The gradient stop offset for a fill fraction.
   * @param fill - Star fill fraction (0–1).
   * @returns The percentage offset.
   */
  offset(fill: number): string {
    return `${fill * 100}%`
  }

  /**
   * The `<path>` fill referencing the star's gradient.
   * @param id - The star's gradient id.
   * @returns The `url(#id)` fill.
   */
  fillUrl(id: string): string {
    return `url(#${id})`
  }

  /**
   * The per-star button label in interactive mode.
   * @param i - Star index (0-based).
   * @returns The accessible label.
   */
  rateLabel(i: number): string {
    return `Rate ${i + 1} of ${this.maxValue()}`
  }

  /**
   * Calls `onChange` with the rating a clicked star selects.
   * @param i - Star index (0-based).
   */
  select(i: number): void {
    this.onChange?.(i + 1)
  }

  /**
   * The root `<span>` class list (`cm.flex({ align: 'center', gap: 'xs' })` +
   * `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'xs' }), this.className)
  }

  /**
   * The root `aria-label` (`ariaLabel`, or React's default).
   * @returns The accessible label.
   */
  label(): string {
    return this.ariaLabel ?? `Rating: ${this.value} of ${this.maxValue()}`
  }

  /**
   * The review-count button class (`cm.textSize('sm')` + `cm.link`).
   * @returns The class string.
   */
  reviewClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().link)
  }

  /**
   * The review-count text span class (`cm.textSize('sm')`).
   * @returns The class string.
   */
  textClasses(): string {
    return this.cm().textSize('sm')
  }
}
