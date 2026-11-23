/**
 * BadgeShelf component (React parity).
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

import type { Badge } from './types.js'

/**
 * BadgeShelf component.
 *
 * Horizontal row of small badge icons earned by a user. React's root is the
 * `<ul>` itself and nothing at all when no badges are supplied, so the `<ul>`
 * renders in front of the host's place while there is something to show and
 * the host itself leaves the page (`placeElementBefore` + `setElementPresent`).
 *
 * Each icon shows its name in a native `title` tooltip. Clicking a badge
 * invokes `onClick(badge)`; clicking the trailing `+N` chip invokes
 * `onClick(null)`.
 */
@Component({
  selector: 'mol-badge-shelf',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['badges', 'limit', 'onClick', 'className'],
  template: `@if (hasBadges()) {
    <ul #root [class]="rootClasses()" [attr.aria-label]="shelfLabel()" data-mol-id="badge-shelf">
      @for (badge of visible(); track badge.id) {
        <li [class]="itemClasses()" [attr.data-badge-id]="badge.id" data-mol-id="badge-shelf-item">
          @if (isInteractive()) {
            <button
              type="button"
              [class]="buttonClasses()"
              (click)="invoke(badge)"
              [attr.title]="tooltip(badge)"
              [attr.aria-label]="badge.name"
              data-mol-id="badge-shelf-button"
            >
              @if (badge.iconSrc) {
                <img
                  [src]="badge.iconSrc"
                  alt=""
                  [class]="iconClasses()"
                  style="width: 24px; height: 24px"
                  data-mol-id="badge-shelf-icon-img"
                />
              } @else {
                <span aria-hidden="true" data-mol-id="badge-shelf-icon-glyph">{{
                  badge.icon ?? '*'
                }}</span>
              }
            </button>
          } @else {
            <span [attr.title]="tooltip(badge)" [attr.aria-label]="badge.name" role="img">
              @if (badge.iconSrc) {
                <img
                  [src]="badge.iconSrc"
                  alt=""
                  [class]="iconClasses()"
                  style="width: 24px; height: 24px"
                  data-mol-id="badge-shelf-icon-img"
                />
              } @else {
                <span aria-hidden="true" data-mol-id="badge-shelf-icon-glyph">{{
                  badge.icon ?? '*'
                }}</span>
              }
            </span>
          }
        </li>
      }
      @if (overflow() > 0) {
        <li [class]="itemClasses()" data-mol-id="badge-shelf-overflow">
          @if (isInteractive()) {
            <button
              type="button"
              [class]="overflowButtonClasses()"
              (click)="invokeOverflow()"
              [attr.aria-label]="overflowLabel()"
              data-mol-id="badge-shelf-overflow-button"
            >
              +{{ overflow() }}
            </button>
          } @else {
            <span [class]="overflowTextClasses()" [attr.aria-label]="overflowLabel()"
              >+{{ overflow() }}</span
            >
          }
        </li>
      }
    </ul>
  }`,
})
export class BadgeShelf {
  /** Earned badges to display, ordered most-prominent-first. */
  badges!: Badge[]
  /** Maximum number of badge icons rendered inline (React's default: 5). */
  limit?: number
  /** Click handler, called with the badge (or `null` for the overflow chip). */
  onClick?: (badge: Badge | null) => void
  /** Extra classes merged onto the outer row. */
  className?: string

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /** React's root (`<ul>`), while at least one badge renders. */
  @ViewChild('root') private root?: ElementRef<HTMLElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    // React's root is the `<ul>` itself (`badges: []` renders nothing): it renders in
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
   * Whether React renders the `<ul>` at all (`badges.length > 0`).
   * @returns True when at least one badge was supplied.
   */
  hasBadges(): boolean {
    return (this.badges?.length ?? 0) > 0
  }

  /**
   * The badges React renders inline (the first `limit`, default 5).
   * @returns The visible badges.
   */
  visible(): Badge[] {
    return (this.badges ?? []).slice(0, this.limit ?? 5)
  }

  /**
   * The number of badges summarised by the trailing `+N` chip.
   * @returns The overflow count (never negative).
   */
  overflow(): number {
    return Math.max(0, (this.badges?.length ?? 0) - this.visible().length)
  }

  /**
   * Whether React makes the icons clickable (`typeof onClick === 'function'`).
   * @returns True when a click handler was given.
   */
  isInteractive(): boolean {
    return typeof this.onClick === 'function'
  }

  /**
   * The badge's native tooltip: its name, plus its description when set.
   * @param badge - The badge.
   * @returns The tooltip text.
   */
  tooltip(badge: Badge): string {
    return badge.description ? `${badge.name} — ${badge.description}` : badge.name
  }

  /**
   * The row's accessible label.
   * @returns The `aria-label`.
   */
  shelfLabel(): string {
    return this.i18n.t(
      'badgeShelf.aria',
      { count: this.badges?.length ?? 0 },
      { defaultValue: '{{count}} badges earned' },
    )
  }

  /**
   * The overflow chip's accessible label.
   * @returns The `aria-label`.
   */
  overflowLabel(): string {
    return this.i18n.t(
      'badgeShelf.overflow.aria',
      { count: this.overflow() },
      { defaultValue: 'Show {{count}} more badges' },
    )
  }

  /**
   * The `<ul>`'s class list.
   * @returns The class string.
   */
  rootClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ align: 'center', gap: 'xs' }), this.className)
  }

  /**
   * One `<li>`'s class list.
   * @returns The class string.
   */
  itemClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', justify: 'center' }))
  }

  /**
   * An interactive badge button's class list.
   * @returns The class string.
   */
  buttonClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.roundedFull)
  }

  /**
   * The overflow button's class list.
   * @returns The class string.
   */
  overflowButtonClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ align: 'center', justify: 'center' }),
      cm.roundedFull,
      cm.textSize('xs'),
      cm.fontWeight('semibold'),
    )
  }

  /**
   * The non-interactive overflow chip's class list.
   * @returns The class string.
   */
  overflowTextClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))
  }

  /**
   * An image icon's class list.
   * @returns The class string.
   */
  iconClasses(): string {
    return this.cm().cn(this.cm().shrink0)
  }

  /**
   * Calls the click handler with the clicked badge.
   * @param badge - The badge whose icon was clicked.
   */
  invoke(badge: Badge): void {
    this.onClick?.(badge)
  }

  /** Calls the click handler with `null`, React's "expand all" signal. */
  invokeOverflow(): void {
    this.onClick?.(null)
  }
}
