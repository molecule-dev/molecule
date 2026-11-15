/**
 * VendorCard component (React parity).
 *
 * @module
 */

import { type AfterViewInit, Component, ElementRef, inject, signal, ViewChild } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-angular'

/**
 * Whether a wrapper element renders anything besides its static content: an
 * element child (a projected `[slot=<name>]` landed — the projection moves
 * into the view at render time) or text beyond the wrapper's own prefix. The
 * `·` prefix is the member-since span's own static text, never content.
 *
 * @param el - The wrapper element.
 * @returns True when its children render anything.
 */
const hasRenderableContent = (el: HTMLElement): boolean =>
  Array.from(el.childNodes).some(
    (node) =>
      node.nodeType === Node.ELEMENT_NODE ||
      (node.nodeType === Node.TEXT_NODE &&
        (node.textContent ?? '').trim().length > 0 &&
        (node.textContent ?? '').trim() !== '·'),
  )

/**
 * VendorCard component.
 *
 * Vendor / seller / agent profile card — Avatar/logo + name + tagline +
 * rating/review count + member-since + badges + actions row. Used in
 * marketplaces, agent directories, multi-tenant catalogs. The host IS the
 * Card's root `<div>` (`div[mol-vendor-card]` wearing `cm.card({ variant:
 * 'elevated' })` + `cm.cardPadding('md')`), matching React's root exactly;
 * `onClick` is a native `(click)` on the host, with no keyboard handler or
 * role — put primary navigation in `actions` buttons for accessibility.
 * `rating` renders a single ★ plus the number (`toFixed(1)`), not a
 * five-star row; `reviewCount` renders only when `rating` is also set. When
 * `name` is not a plain string the Avatar alt falls back to hardcoded
 * 'Vendor'. Same props, same DOM as `@molecule/app-vendor-card-react`'s
 * `VendorCard`. Node-valued `name`, `description`, `memberSince`, `badges`
 * and `actions` content is projected (`[slot=<name>]`); a string or number
 * input renders as text. The optional wrappers (`description`, `memberSince`,
 * `actions`) render optimistically so a projection can land, then withdraw at
 * view init when neither a text input nor a projection is present — React
 * renders no wrapper at all for them.
 */
@Component({
  selector: 'div[mol-vendor-card]',
  standalone: true,
  imports: [Avatar],
  inputs: [
    'name',
    'logoSrc',
    'description',
    'rating',
    'reviewCount',
    'memberSince',
    'badges',
    'actions',
    'className',
  ],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<div [class]="cm().flex({ align: 'start', gap: 'md' })">
    <div mol-avatar [src]="logoSrc" [alt]="displayName()" [name]="displayName()" [size]="'lg'"></div>
    <div [class]="cm().cn(cm().flex1, cm().stack(2))">
      <header>
        <h3 [class]="cm().cn(cm().textSize('lg'), cm().fontWeight('bold'))">@if (hasName) {<ng-container>{{ name }}</ng-container>}<ng-content select="[slot=name]" /></h3>@if (showDescription) {<p #descriptionEl [class]="cm().textSize('sm')">@if (hasDescription) {<ng-container>{{ description }}</ng-container>}<ng-content select="[slot=description]" /></p>}
      </header>
      <div [class]="cm().flex({ align: 'center', gap: 'sm', wrap: 'wrap' })">@if (hasRating) {<span [class]="ratingClass()"><span aria-hidden="true">★</span><span [class]="cm().fontWeight('semibold')">{{ ratingText() }}</span>@if (hasReviewCount) {<span>{{ reviewText() }}</span>}</span>}@if (showMemberSince) {<span #memberSinceEl [class]="cm().textSize('xs')">· @if (hasMemberSince) {<ng-container>{{ memberSince }}</ng-container>}<ng-content select="[slot=memberSince]" /></span>}@if (hasBadges) {<ng-container>{{ badges }}</ng-container>}<ng-content select="[slot=badges]" /></div>@if (showActions) {<div #actionsEl [class]="cm().flex({ align: 'center', gap: 'sm' })">@if (hasActions) {<ng-container>{{ actions }}</ng-container>}<ng-content select="[slot=actions]" /></div>}
    </div>
  </div>`,
})
export class VendorCard implements AfterViewInit {
  /** Vendor / seller display name: text, or `[slot=name]` content. */
  name?: unknown
  /** Optional logo URL — falls back to Avatar text initials. */
  logoSrc?: string
  /** Tagline / one-liner: text, or `[slot=description]` content. */
  description?: unknown
  /** 0-5 average rating. */
  rating?: number
  /** Total review count. */
  reviewCount?: number
  /** Member-since date display: text, or `[slot=memberSince]` content. */
  memberSince?: unknown
  /** Optional badges row: text, or `[slot=badges]` content. */
  badges?: unknown
  /** Right-side actions: text, or `[slot=actions]` content. */
  actions?: unknown
  /** Extra classes. */
  className?: string

  /** The optional description paragraph (projected content lands here). */
  @ViewChild('descriptionEl') private descriptionEl?: ElementRef<HTMLParagraphElement>
  /** The optional member-since span (projected content lands here). */
  @ViewChild('memberSinceEl') private memberSinceEl?: ElementRef<HTMLSpanElement>
  /** The optional actions row (projected content lands here). */
  @ViewChild('actionsEl') private actionsEl?: ElementRef<HTMLDivElement>

  /** The host element, scanned for projected `[slot=<name>]` content. */
  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef)

  /** Whether a `[slot=description]` projection landed (true until proven otherwise). */
  private readonly descriptionProjected = signal(true)
  /** Whether a `[slot=memberSince]` projection landed (true until proven otherwise). */
  private readonly memberSinceProjected = signal(true)
  /** Whether a `[slot=actions]` projection landed (true until proven otherwise). */
  private readonly actionsProjected = signal(true)

  /**
   * Withdraws the optimistic optional wrappers whose slot projections did not
   * land: when neither a text input nor projected content is present, React
   * renders no wrapper at all. View queries resolve at view init, and a
   * projected slot's content is in place by then.
   */
  ngAfterViewInit(): void {
    const description = this.descriptionEl?.nativeElement
    if (description && !this.hasDescription && !hasRenderableContent(description)) {
      this.descriptionProjected.set(false)
    }
    const memberSince = this.memberSinceEl?.nativeElement
    if (memberSince && !this.hasMemberSince && !hasRenderableContent(memberSince)) {
      this.memberSinceProjected.set(false)
    }
    const actions = this.actionsEl?.nativeElement
    if (actions && !this.hasActions && !hasRenderableContent(actions)) {
      this.actionsProjected.set(false)
    }
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the Card root class list (Card's elevated variant and md
   * padding defaults, plus the extra classes).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().card({ variant: 'elevated' }),
      this.cm().cardPadding('md'),
      this.className,
    )
  }

  /**
   * The avatar row's class.
   * @returns The class string.
   */
  avatarRowClass(): string {
    return this.cm().flex({ align: 'start', gap: 'md' })
  }

  /**
   * The body column's class.
   * @returns The class string.
   */
  bodyClass(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(2))
  }

  /**
   * The name heading's class.
   * @returns The class string.
   */
  headingClass(): string {
    return this.cm().cn(this.cm().textSize('lg'), this.cm().fontWeight('bold'))
  }

  /**
   * The description paragraph's class.
   * @returns The class string.
   */
  descriptionClass(): string {
    return this.cm().textSize('sm')
  }

  /**
   * The rating / badges row's class.
   * @returns The class string.
   */
  metaRowClass(): string {
    return this.cm().flex({ align: 'center', gap: 'sm', wrap: 'wrap' })
  }

  /**
   * The rating chip's class.
   * @returns The class string.
   */
  ratingClass(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'xs' }), this.cm().textSize('sm'))
  }

  /**
   * The member-since text's class.
   * @returns The class string.
   */
  memberSinceClass(): string {
    return this.cm().textSize('xs')
  }

  /**
   * The actions row's class.
   * @returns The class string.
   */
  actionsClass(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The Avatar's alt/name (React's `typeof name === 'string' ? name :
   * 'Vendor'`).
   * @returns The display name.
   */
  displayName(): string {
    return typeof this.name === 'string' ? this.name : 'Vendor'
  }

  /**
   * The formatted rating, one decimal place (React's `rating.toFixed(1)`).
   * @returns The rating text.
   */
  ratingText(): string {
    return (this.rating ?? 0).toFixed(1)
  }

  /**
   * The review count in parentheses (React's `({reviewCount})`).
   * @returns The review count text.
   */
  reviewText(): string {
    return `(${this.reviewCount})`
  }

  /**
   * Whether a text name input is present (a projected name is not).
   * @returns True when the name renders as text.
   */
  get hasName(): boolean {
    return this.name !== undefined && this.name !== null
  }

  /**
   * Whether the description renders as text: React's `description && …`
   * truthiness.
   * @returns True when the tagline text shows.
   */
  get hasDescription(): boolean {
    return this.description !== undefined && this.description !== null && this.description !== ''
  }

  /**
   * Whether the description paragraph renders at all: the text input or
   * projected `[slot=description]` content.
   * @returns True when the tagline shows.
   */
  get showDescription(): boolean {
    return this.hasDescription || this.descriptionProjected()
  }

  /**
   * Whether a rating renders: React's `rating !== undefined` (a zero rating
   * still renders).
   * @returns True when the ★ chip shows.
   */
  get hasRating(): boolean {
    return this.rating !== undefined
  }

  /**
   * Whether the review count renders: React's `reviewCount !== undefined`,
   * only inside a rating.
   * @returns True when the count shows.
   */
  get hasReviewCount(): boolean {
    return this.reviewCount !== undefined
  }

  /**
   * Whether the member-since text renders: React's `memberSince && …`
   * truthiness.
   * @returns True when the date text shows.
   */
  get hasMemberSince(): boolean {
    return this.memberSince !== undefined && this.memberSince !== null && this.memberSince !== ''
  }

  /**
   * Whether the member-since span renders at all: the text input or projected
   * `[slot=memberSince]` content.
   * @returns True when the date shows.
   */
  get showMemberSince(): boolean {
    return this.hasMemberSince || this.memberSinceProjected()
  }

  /**
   * Whether the badges text renders: React's `badges && …` truthiness (the
   * `[slot=badges]` projection renders regardless).
   * @returns True when the badges text shows.
   */
  get hasBadges(): boolean {
    return this.badges !== undefined && this.badges !== null && this.badges !== ''
  }

  /**
   * Whether the actions text renders: React's `actions && …` truthiness.
   * @returns True when the actions text shows.
   */
  get hasActions(): boolean {
    return this.actions !== undefined && this.actions !== null && this.actions !== ''
  }

  /**
   * Whether the actions row renders at all: the text input or projected
   * `[slot=actions]` content.
   * @returns True when the actions row shows.
   */
  get showActions(): boolean {
    return this.hasActions || this.actionsProjected()
  }
}
