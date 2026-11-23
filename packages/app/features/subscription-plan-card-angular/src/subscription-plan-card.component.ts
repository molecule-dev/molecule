/**
 * SubscriptionPlanCard component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, ElementRef, signal, type TemplateRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  placeElement,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, styleText } from '@molecule/app-ui-angular'

/**
 * Whether a value is one of the case's projected node templates
 * (`{ $nodes }` inside a data prop becomes a `TemplateRef`).
 *
 * @param value - The prop value.
 * @returns True for a projected node template.
 */
const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' && value !== null && 'createEmbeddedView' in value

/**
 * SubscriptionPlanCard component.
 *
 * Pricing / subscription plan card — header (badge + name + description),
 * price + interval, feature checklist, and a primary CTA (button or link).
 * The host IS the card `<div>` (`div[mol-subscription-plan-card]`), matching
 * React's root exactly, so the card's ClassMap classes and the recommended
 * outline style are the host's.
 *
 * Node props (`name`, `description`, `price`, `interval`, `ctaLabel`, `badge`)
 * are projected content (`[slot=<name>]`), and a `features` entry that is a
 * node is a projected template; plain strings are inputs. The optional
 * description / interval / badge wrappers and the CTA render only when React
 * would render them — Angular projection needs always-mounted capture points,
 * so {@link SubscriptionPlanCard.reconcile} takes an unrendered wrapper out of
 * the DOM ({@link setElementPresent}) and renders the CTA where React nests it
 * ({@link placeElement}).
 */
@Component({
  selector: 'div[mol-subscription-plan-card]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Button, NgTemplateOutlet],
  inputs: [
    'name',
    'description',
    'price',
    'interval',
    'features',
    'ctaLabel',
    'onCta',
    'ctaHref',
    'recommended',
    'badge',
    'className',
  ],
  host: {
    '[class]': 'cardClasses()',
    '[style]': 'hostStyle()',
  },
  // prettier-ignore
  template: `<div [class]="cm().stack(4)"><header [class]="cm().stack(1)"><span #badgeWrap [class]="badgeClass()">@if (badgeProvided()) {<ng-container>{{ badge }}</ng-container>}<span #badgeCapture><ng-content select="[slot=badge]"></ng-content></span>@if (badgeDefault()) {<ng-container>{{ recommendedBadge() }}</ng-container>}</span><h3 [class]="nameClass()">@if (hasName()) {<ng-container>{{ name }}</ng-container>}<ng-content select="[slot=name]"></ng-content></h3><p #descriptionWrap [class]="cm().textSize('sm')">@if (hasDescription()) {<ng-container>{{ description }}</ng-container>}<ng-content select="[slot=description]"></ng-content></p></header><div [class]="cm().flex({ align: 'baseline', gap: 'xs' })"><span [class]="priceClass()">@if (hasPrice()) {<ng-container>{{ price }}</ng-container>}<ng-content select="[slot=price]"></ng-content></span><span #intervalWrap [class]="cm().textSize('sm')">@if (hasInterval()) {<ng-container>{{ interval }}</ng-container>}<ng-content select="[slot=interval]"></ng-content></span></div><ul [class]="cm().stack(2)">@for (feature of features; track $index) {<li [class]="cm().flex({ align: 'start', gap: 'sm' })"><span aria-hidden="true">✓</span><span [class]="cm().textSize('sm')">@if (isTemplate(feature)) {<ng-container [ngTemplateOutlet]="asTemplate(feature)"></ng-container>} @else {<ng-container>{{ feature }}</ng-container>}</span></li>}</ul><a #ctaAnchor [attr.href]="ctaHref"></a><button #ctaButton mol-button [variant]="'solid'" [color]="ctaColor()" (click)="onCtaClick($event)"><span #ctaLabelCapture><ng-content select="[slot=ctaLabel]"></ng-content></span>@if (hasCtaLabel()) {<ng-container>{{ ctaLabel }}</ng-container>}</button></div>`,
})
export class SubscriptionPlanCard {
  /** Plan name — a string input, or `[slot=name]` projected content. */
  name?: unknown
  /** Optional tagline / one-liner — a string input, or `[slot=description]` content. */
  description?: unknown
  /** Price string — a string input, or `[slot=price]` projected content. */
  price?: unknown
  /** Billing interval label — a string input, or `[slot=interval]` content. */
  interval?: unknown
  /** Bullet feature list; a node entry arrives as a projected template. */
  features: unknown[] = []
  /** Primary CTA button label — a string input, or `[slot=ctaLabel]` content. */
  ctaLabel?: unknown
  /** Click / nav handler (receives the click event, as React's CTA does). */
  onCta?: (event?: Event) => void
  /** When set, the CTA renders inside a plain anchor to this URL. */
  ctaHref?: string
  /** Visually highlight as the recommended / popular plan. */
  recommended?: boolean
  /** Optional badge content — a string input, or `[slot=badge]` content. */
  badge?: unknown
  /** Extra classes on the card. */
  className?: string

  /** The optional badge wrapper (absent when React would render none). */
  @ViewChild('badgeWrap') private badgeWrap?: ElementRef<HTMLElement>
  /** The optional description paragraph. */
  @ViewChild('descriptionWrap') private descriptionWrap?: ElementRef<HTMLElement>
  /** The optional interval span. */
  @ViewChild('intervalWrap') private intervalWrap?: ElementRef<HTMLElement>
  /** The CTA anchor (present only when `ctaHref` is set). */
  @ViewChild('ctaAnchor') private ctaAnchor?: ElementRef<HTMLAnchorElement>
  /** The CTA button (its element: the host also carries the UI Button component). */
  @ViewChild('ctaButton', { read: ElementRef }) private ctaButton?: ElementRef<HTMLButtonElement>
  /** Where the badge slot is projected: its content renders in its place, and it leaves the page. */
  @ViewChild('badgeCapture') private badgeCapture?: ElementRef<HTMLElement>
  /** Where the CTA label slot is projected (the UI Button's own nodes are not content). */
  @ViewChild('ctaLabelCapture') private ctaLabelCapture?: ElementRef<HTMLElement>

  /** The i18n provider above the card (the "Recommended" badge). */
  private readonly i18n = useTranslation()

  /** Whether the badge slot has been read once, so the default never renders before it is known. */
  private readonly badgeSlotRead = signal(false)
  /** Whether the description slot holds content. */
  private readonly descriptionSlot = signal(false)
  /** Whether the interval slot holds content. */
  private readonly intervalSlot = signal(false)
  /** Whether the badge slot holds content. */
  private readonly badgeSlot = signal(false)
  /** Whether the CTA label slot holds content. */
  private readonly ctaLabelSlot = signal(false)

  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The card's class list (React's `Card` with no variant: the elevated card
   * plus medium padding, then `className`).
   * @returns The class string.
   */
  cardClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.card({ variant: 'elevated' }), cm.cardPadding('md'), this.className)
  }

  /**
   * The recommended outline, serialized as React's inline style writes it.
   * @returns The style attribute text, or null.
   */
  hostStyle(): string | null {
    return styleText(
      this.recommended ? { outline: '2px solid currentColor', outlineOffset: -2 } : undefined,
    )
  }

  /**
   * The badge span's class list (`cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  badgeClass(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('semibold'))
  }

  /**
   * The name's class list (`cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))`).
   * @returns The class string.
   */
  nameClass(): string {
    return this.cm().cn(this.cm().textSize('xl'), this.cm().fontWeight('bold'))
  }

  /**
   * The price's class list (`cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'))`).
   * @returns The class string.
   */
  priceClass(): string {
    return this.cm().cn(this.cm().textSize('4xl'), this.cm().fontWeight('bold'))
  }

  /**
   * Whether the name input holds a value (projected content renders anyway).
   * @returns True when a value is set.
   */
  hasName(): boolean {
    return this.name !== undefined && this.name !== null && this.name !== false
  }

  /**
   * Whether the description input holds a value.
   * @returns True when a value is set.
   */
  hasDescription(): boolean {
    return this.description !== undefined && this.description !== null
  }

  /**
   * Whether the price input holds a value.
   * @returns True when a value is set.
   */
  hasPrice(): boolean {
    return this.price !== undefined && this.price !== null && this.price !== false
  }

  /**
   * Whether the interval input holds a value.
   * @returns True when a value is set.
   */
  hasInterval(): boolean {
    return this.interval !== undefined && this.interval !== null
  }

  /**
   * Whether the CTA label input holds a value.
   * @returns True when a value is set.
   */
  hasCtaLabel(): boolean {
    return this.ctaLabel !== undefined && this.ctaLabel !== null
  }

  /**
   * Whether the badge input holds a value (React's `badge ?? t(…)` treats an
   * empty badge as a provided, blank badge).
   * @returns True when a value is set.
   */
  badgeProvided(): boolean {
    return this.badge !== undefined && this.badge !== null
  }

  /**
   * React's `(badge || recommended)`.
   * @returns Whether the badge span renders.
   */
  showBadge(): boolean {
    return Boolean(this.badge) || this.badgeSlot() || Boolean(this.recommended)
  }

  /**
   * React's `badge ?? t('plan.recommended', {}, { defaultValue: 'Recommended' })`,
   * minus the input/slot cases (the template renders those directly).
   * @returns Whether the translated default badge renders.
   */
  badgeDefault(): boolean {
    return (
      this.badgeSlotRead() &&
      Boolean(this.recommended) &&
      !this.badgeProvided() &&
      !this.badgeSlot()
    )
  }

  /**
   * The translated default badge text.
   * @returns The text.
   */
  recommendedBadge(): string {
    return this.i18n.t('plan.recommended', {}, { defaultValue: 'Recommended' })
  }

  /**
   * React's `description && <p>`.
   * @returns Whether the description paragraph renders.
   */
  showDescription(): boolean {
    return Boolean(this.description) || this.descriptionSlot()
  }

  /**
   * React's `interval && <span>`.
   * @returns Whether the interval span renders.
   */
  showInterval(): boolean {
    return Boolean(this.interval) || this.intervalSlot()
  }

  /**
   * React's `{ctaLabel && cta}` — an empty label hides the CTA.
   * @returns Whether the CTA renders.
   */
  showCta(): boolean {
    return Boolean(this.ctaLabel) || this.ctaLabelSlot()
  }

  /**
   * The CTA button's ClassMap color.
   * @returns `'primary'` for a recommended plan, else `'secondary'`.
   */
  ctaColor(): 'primary' | 'secondary' {
    return this.recommended ? 'primary' : 'secondary'
  }

  /**
   * Whether a `features` entry is a projected template.
   * @param value - The entry.
   * @returns True for a projected node template.
   */
  isTemplate(value: unknown): value is TemplateRef<unknown> {
    return isTemplate(value)
  }

  /**
   * The entry as a template (call under {@link isTemplate}).
   * @param value - The entry.
   * @returns The template.
   */
  asTemplate(value: unknown): TemplateRef<unknown> {
    return value as TemplateRef<unknown>
  }

  /**
   * React's CTA `onClick`: only the button branch has a handler (`ctaHref`
   * renders an anchor around a handler-less button).
   * @param event - The DOM click event.
   */
  onCtaClick(event: Event): void {
    if (!this.ctaHref) this.onCta?.(event)
  }

  /**
   * Reads the projected slots' presence, toggles the optional wrappers and
   * attaches the CTA's anchor/button for React's DOM.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const badge = this.badgeWrap?.nativeElement
    const description = this.descriptionWrap?.nativeElement
    const interval = this.intervalWrap?.nativeElement
    // Each slot's capture holds only the consumer's content (the badge input and
    // the default text render beside it), so it is read on every run.
    const badgeCapture = this.badgeCapture?.nativeElement
    if (badgeCapture) {
      this.badgeSlot.set(hasContent(badgeCapture))
      this.badgeSlotRead.set(true)
    }
    if (description) this.descriptionSlot.set(hasContent(description))
    if (interval) this.intervalSlot.set(hasContent(interval))
    // The button hosts the UI Button, whose own slot placeholders are not the
    // port's content: read the label's capture, not the button.
    const ctaLabelCapture = this.ctaLabelCapture?.nativeElement
    this.ctaLabelSlot.set(hasContent(ctaLabelCapture))
    for (const capture of [badgeCapture, ctaLabelCapture]) {
      placeContentBefore(capture, capture)
      setElementPresent(capture, false)
    }
    setElementPresent(badge, this.showBadge())
    setElementPresent(description, this.showDescription())
    setElementPresent(interval, this.showInterval())
    this.syncCta()
  }

  /**
   * Places the CTA's anchor and button the way React nests them: an anchor
   * around the button when `ctaHref` is set, the button alone otherwise, and
   * neither when the label is empty. {@link placeElement} moves the button into
   * the anchor and back to the place Angular gave it.
   */
  private syncCta(): void {
    const anchor = this.ctaAnchor?.nativeElement
    const button = this.ctaButton?.nativeElement
    if (!anchor || !button) return
    if (!this.showCta()) {
      setElementPresent(button, false)
      setElementPresent(anchor, false)
      return
    }
    const href = Boolean(this.ctaHref)
    setElementPresent(button, true)
    setElementPresent(anchor, href)
    placeElement(button, href ? anchor : null)
  }
}
