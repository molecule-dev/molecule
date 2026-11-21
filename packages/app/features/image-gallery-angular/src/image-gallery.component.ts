/**
 * ImageGallery component (React parity).
 *
 * @module
 */

import { Component, EventEmitter, Output } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Column counts the ClassMap `cm.grid()` resolver can actually render. The
 * `@molecule/app-ui-tailwind` grid CVA only defines these keys — any other
 * value produces no `grid-cols-*` class and the thumbnails collapse into a
 * single column. Keep in sync with that bond's `grid` variants.
 */
const SUPPORTED_GRID_COLS = [1, 2, 3, 4, 5, 6, 12] as const

/**
 * Snaps an arbitrary desired column count to the largest ClassMap-supported
 * value that does not exceed it (minimum 1). This lets any `maxThumbnails`
 * render a real grid — thumbnails beyond the chosen column count simply wrap
 * onto additional rows instead of breaking the layout.
 *
 * @param desired - The requested number of columns (e.g. `maxThumbnails`).
 * @returns A column count guaranteed to resolve to a `grid-cols-*` class.
 */
function toGridCols(desired: number): number {
  const clamped = Math.max(1, Math.floor(desired || 0))
  let best: number = SUPPORTED_GRID_COLS[0]
  for (const cols of SUPPORTED_GRID_COLS) {
    if (cols <= clamped) best = cols
  }
  return best
}

/**
 * ImageGallery component.
 *
 * Main image + thumbnail grid gallery. Controlled-optional: when
 * `selectedIndex` is omitted the component tracks its own selection. Used for
 * product images, property listings, portfolio galleries.
 *
 * React's root is the outer `<div>` when images are present and nothing when
 * they are not, so the host is an empty, layout-neutral element
 * (`display: contents`) that the DOM normalizer unwraps
 * (`data-parity-unwrap`) and the template renders exactly React's tree —
 * the same convention the UI kit's fragment-rooted Angular components use.
 */
@Component({
  selector: 'mol-image-gallery',
  standalone: true,
  inputs: ['images', 'selectedIndex', 'maxThumbnails', 'alts', 'className'],
  outputs: ['select'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  template: `@if (images.length > 0) {
    <div [class]="classes()">
      <div style="aspect-ratio: 4 / 3">
        @if (mainSrc(); as src) {
          <img
            [attr.src]="src"
            [attr.alt]="mainAlt()"
            style="width: 100%; height: 100%; object-fit: cover"
          />
        } @else {
          <img [attr.alt]="mainAlt()" style="width: 100%; height: 100%; object-fit: cover" />
        }
      </div>
      @if (images.length > 1) {
        <div [class]="gridClasses()">
          @for (src of visible(); track $index; let i = $index) {
            <button
              type="button"
              (click)="selectIndex(i)"
              [attr.aria-current]="i === idx() ? 'true' : null"
              [attr.aria-label]="thumbAlt(i)"
              style="aspect-ratio: 1 / 1"
            >
              <img [attr.src]="src" alt="" style="width: 100%; height: 100%; object-fit: cover" />
            </button>
          }
          @if (overflow() > 0) {
            <div [class]="overflowClasses()" style="aspect-ratio: 1 / 1">{{ overflowText() }}</div>
          }
        </div>
      }
    </div>
  }`,
})
export class ImageGallery {
  /** Image URLs in display order. */
  images: string[] = []
  /** Controlled selected index — caller owns state. */
  selectedIndex?: number
  /** Max thumbnails shown (defaults to `4` at read time; extra are "+N"). */
  maxThumbnails?: number
  /**
   * Alt-text for screen readers, per image (falls back through i18n to
   * `'Image {{number}}'`, `imageGallery.alt.fallback`).
   */
  alts?: string[]
  /** Extra classes on the outer wrapper. */
  className?: string

  /** Fires with the clicked thumbnail's index (React's `onSelect`). */
  @Output() readonly select = new EventEmitter<number>()

  /** The component's own selection while it is uncontrolled. */
  private internalIndex = 0

  /** The i18n binding the alt fallback and overflow chip read. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The max thumbnails to show (React's default parameter: a later write of
   * `undefined` must not erase the `4` default).
   * @returns The effective max thumbnails.
   */
  maxThumbnailCount(): number {
    return this.maxThumbnails ?? 4
  }

  /**
   * The selected index: the controlled prop, else the component's own.
   * @returns The selected index.
   */
  idx(): number {
    return this.selectedIndex ?? this.internalIndex
  }

  /**
   * The thumbnails React keeps (`images.slice(0, maxThumbnails)`).
   * @returns The visible image URLs.
   */
  visible(): string[] {
    return this.images.slice(0, this.maxThumbnailCount())
  }

  /**
   * How many images the "+N" chip summarises.
   * @returns The overflow count.
   */
  overflow(): number {
    return Math.max(0, this.images.length - this.visible().length)
  }

  /**
   * The main image's source (React's `images[idx]`).
   * @returns The URL, or `null` when the index is out of range. React renders
   *   the `src` attribute away; Angular's renderer rewrites a null `src` on an
   *   `<img>` to `src=""`, so the template picks an element without `src`.
   */
  mainSrc(): string | null {
    return this.images[this.idx()] ?? null
  }

  /**
   * The main image's alt text (React's `alts?.[idx] ?? t(…)` with the
   * `imageGallery.alt.fallback` fallback).
   * @returns The alt text.
   */
  mainAlt(): string {
    return (
      this.alts?.[this.idx()] ??
      this.i18n.t(
        'imageGallery.alt.fallback',
        { number: this.idx() + 1 },
        { defaultValue: 'Image {{number}}' },
      )
    )
  }

  /**
   * One thumbnail's aria-label (React's `alts?.[i] ?? t(…)` with the
   * `imageGallery.alt.fallback` fallback).
   *
   * @param index - The thumbnail's index.
   * @returns The label text.
   */
  thumbAlt(index: number): string {
    return (
      this.alts?.[index] ??
      this.i18n.t(
        'imageGallery.alt.fallback',
        { number: index + 1 },
        { defaultValue: 'Image {{number}}' },
      )
    )
  }

  /**
   * The "+N" chip's text (React's `t('imageGallery.overflow.more', …)`).
   * @returns The chip text, e.g. `+2`.
   */
  overflowText(): string {
    return this.i18n.t(
      'imageGallery.overflow.more',
      { count: this.overflow() },
      { defaultValue: '+{{count}}' },
    )
  }

  /**
   * The wrapper class list (React's `cm.cn(cm.stack(2), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(2), this.className)
  }

  /**
   * The thumbnail grid's class (React's `cm.grid({ cols, gap: 'sm' })`).
   * @returns The class string.
   */
  gridClasses(): string {
    return this.cm().grid({ cols: toGridCols(this.maxThumbnailCount()), gap: 'sm' })
  }

  /**
   * The "+N" chip's class list (React's `cm.cn(cm.flex(…), cm.textSize('sm'),
   * cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  overflowClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'center' }),
      this.cm().textSize('sm'),
      this.cm().fontWeight('semibold'),
    )
  }

  /**
   * Selects thumbnail `index`, keeping the internal state only while the
   * gallery is uncontrolled, then emits React's `onSelect`.
   *
   * @param index - The clicked thumbnail's index.
   */
  selectIndex(index: number): void {
    if (this.selectedIndex === undefined) this.internalIndex = index
    this.select.emit(index)
  }
}
