/**
 * ListingCardBody component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/** Whether a value renders as plain text (React renders strings and numbers). */
const hasText = (value: unknown): boolean =>
  typeof value === 'number' || (typeof value === 'string' && value !== '')

/**
 * ListingCardBody component.
 *
 * Body of a listing card — title / subtitle / price / meta rows stacked. The
 * host IS the root `div` (`div[mol-listing-card-body]`), matching React's root
 * exactly. Node rows are projected content (`[slot=<name>]`) or plain text
 * inputs; an optional row renders only while it has a text input or
 * projected content, as React's `{subtitle && <p>…}` does, and follows
 * content a consumer projects later.
 */
@Component({
  selector: 'div[mol-listing-card-body]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['title', 'subtitle', 'price', 'meta', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<h3 [class]="titleClasses()">@if (hasTitle()) {{{ title }}}<ng-content select="[slot=title]"></ng-content></h3><p #subtitleEl [class]="subtitleClasses()">@if (hasSubtitle()) {{{ subtitle }}}<ng-content select="[slot=subtitle]"></ng-content></p><p #priceEl [class]="priceClasses()">@if (hasPrice()) {{{ price }}}<ng-content select="[slot=price]"></ng-content></p><div #metaEl [class]="metaClasses()">@if (hasMeta()) {{{ meta }}}<ng-content select="[slot=meta]"></ng-content></div>`,
})
export class ListingCardBody {
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

  /** The optional subtitle paragraph (a text input or projected content lands here). */
  @ViewChild('subtitleEl', { static: true }) private subtitleEl?: ElementRef<HTMLElement>
  /** The optional price paragraph. */
  @ViewChild('priceEl', { static: true }) private priceEl?: ElementRef<HTMLElement>
  /** The optional meta row. */
  @ViewChild('metaEl', { static: true }) private metaEl?: ElementRef<HTMLElement>

  /**
   * Shows each optional row while it has a text input or projected content
   * (React's `{subtitle && <p>…}`); a row stays in the template, so content a
   * consumer projects later renders in it.
   */
  constructor() {
    usePlacement((hasContent) => this.syncRows(hasContent))
  }

  /**
   * Applies the rows' presence.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private syncRows(hasContent: SlotReader): void {
    const row = (el: HTMLElement | undefined, text: boolean): void =>
      setElementPresent(el, text || (el !== undefined && hasContent(el)))
    row(this.subtitleEl?.nativeElement, this.hasSubtitle())
    row(this.priceEl?.nativeElement, this.hasPrice())
    row(this.metaEl?.nativeElement, this.hasMeta())
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
}
