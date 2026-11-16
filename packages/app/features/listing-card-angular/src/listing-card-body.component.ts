/**
 * ListingCardBody component (React parity).
 *
 * @module
 */

import { type AfterViewInit, Component, type ElementRef, signal, ViewChild } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { hasNodes } from '@molecule/app-ui-angular'

/** Whether a value renders as plain text (React renders strings and numbers). */
const hasText = (value: unknown): boolean =>
  typeof value === 'number' || (typeof value === 'string' && value !== '')

/**
 * ListingCardBody component.
 *
 * Body of a listing card — title / subtitle / price / meta rows stacked. The
 * host IS the root `div` (`div[mol-listing-card-body]`), matching React's root
 * exactly. Node rows are projected content (`[slot=<name>]`) or plain text
 * inputs; the optional rows render only when React would render them, which
 * {@link ListingCardBody.ngAfterViewInit} reconciles once projection is
 * visible.
 */
@Component({
  selector: 'div[mol-listing-card-body]',
  standalone: true,
  inputs: ['title', 'subtitle', 'price', 'meta', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<h3 [class]="titleClasses()">@if (hasTitle()) {{{ title }}}<ng-content select="[slot=title]"></ng-content></h3>@if (showSubtitle()) {<p #subtitleEl [class]="subtitleClasses()">@if (hasSubtitle()) {{{ subtitle }}}<ng-content select="[slot=subtitle]"></ng-content></p>}@if (showPrice()) {<p #priceEl [class]="priceClasses()">@if (hasPrice()) {{{ price }}}<ng-content select="[slot=price]"></ng-content></p>}@if (showMeta()) {<div #metaEl [class]="metaClasses()">@if (hasMeta()) {{{ meta }}}<ng-content select="[slot=meta]"></ng-content></div>}`,
})
export class ListingCardBody implements AfterViewInit {
  /** Primary title / name — a text input, or `[slot=title]` projected content. */
  title?: unknown
  /** Secondary line — a text input, or `[slot=subtitle]` projected content. */
  subtitle?: unknown
  /** Price / metric line — a text input, or `[slot=price]` projected content. */
  price?: unknown
  /** Optional extras row — a text input, or `[slot=meta]` projected content. */
  meta?: unknown
  /** Extra classes. */
  className?: string

  /** The optional subtitle paragraph (projected content lands here; read once). */
  @ViewChild('subtitleEl') private subtitleEl?: ElementRef<HTMLElement>
  /** The optional price paragraph (projected content lands here; read once). */
  @ViewChild('priceEl') private priceEl?: ElementRef<HTMLElement>
  /** The optional meta row (projected content lands here; read once). */
  @ViewChild('metaEl') private metaEl?: ElementRef<HTMLElement>

  /**
   * Whether a `[slot=subtitle]` projection landed: true (optimistically) until
   * the first view proves otherwise.
   */
  private readonly subtitleProjected = signal(true)
  /**
   * Whether a `[slot=price]` projection landed (true until the first view
   * proves otherwise).
   */
  private readonly priceProjected = signal(true)
  /**
   * Whether a `[slot=meta]` projection landed (true until the first view proves
   * otherwise).
   */
  private readonly metaProjected = signal(true)

  /**
   * Reads the optional rows' first render: when neither a text input nor
   * projected content landed, React would not render the row at all, so the
   * optimistic render is withdrawn.
   */
  ngAfterViewInit(): void {
    const subtitle = this.subtitleEl?.nativeElement
    if (subtitle) this.subtitleProjected.set(!this.hasSubtitle() && hasNodes(subtitle))
    const price = this.priceEl?.nativeElement
    if (price) this.priceProjected.set(!this.hasPrice() && hasNodes(price))
    const meta = this.metaEl?.nativeElement
    if (meta) this.metaProjected.set(!this.hasMeta() && hasNodes(meta))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The root class list (React's `cm.cn(cm.stack(1), cm.sp('p', 3), className)`).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.stack(1), cm.sp('p', 3), this.className)
  }

  /**
   * The title heading's class list (React's
   * `cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  titleClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))
  }

  /**
   * The subtitle paragraph's class list (React's `cm.textSize('sm')`).
   * @returns The class string.
   */
  subtitleClasses(): string {
    return this.cm().textSize('sm')
  }

  /**
   * The price paragraph's class list (React's
   * `cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))`).
   * @returns The class string.
   */
  priceClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))
  }

  /**
   * The meta row's class list (React's
   * `cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })`).
   * @returns The class string.
   */
  metaClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm', wrap: 'wrap' })
  }

  /**
   * Whether a text title input renders (a projected title is not text).
   * @returns True when the title renders as text.
   */
  hasTitle(): boolean {
    return hasText(this.title)
  }

  /**
   * Whether a text subtitle input renders (React's `subtitle && …`).
   * @returns True when the subtitle renders as text.
   */
  hasSubtitle(): boolean {
    return hasText(this.subtitle)
  }

  /**
   * Whether a text price input renders (React's `price && …`).
   * @returns True when the price renders as text.
   */
  hasPrice(): boolean {
    return hasText(this.price)
  }

  /**
   * Whether a text meta input renders (React's `meta && …`).
   * @returns True when the meta renders as text.
   */
  hasMeta(): boolean {
    return hasText(this.meta)
  }

  /**
   * Whether the subtitle paragraph renders: a text input or a projected
   * `[slot=subtitle]` element.
   * @returns True when the subtitle shows.
   */
  showSubtitle(): boolean {
    return this.hasSubtitle() || this.subtitleProjected()
  }

  /**
   * Whether the price paragraph renders.
   * @returns True when the price shows.
   */
  showPrice(): boolean {
    return this.hasPrice() || this.priceProjected()
  }

  /**
   * Whether the meta row renders.
   * @returns True when the meta row shows.
   */
  showMeta(): boolean {
    return this.hasMeta() || this.metaProjected()
  }
}
