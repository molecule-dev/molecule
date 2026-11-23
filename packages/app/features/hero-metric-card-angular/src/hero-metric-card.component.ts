/**
 * HeroMetricCard component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, signal, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContent,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { ColorVariant, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { HeroMetricTrendChip } from './hero-metric-trend-chip.component.js'
import type { HeroMetricAccent, HeroMetricSemanticAccent, HeroMetricTrend } from './types.js'

/**
 * Maps a semantic hero accent to a real ClassMap color token. The theme
 * exposes no `danger`/`neutral` color token, so those names are translated to
 * the tokens that DO exist (`danger → error`, `neutral → secondary`).
 */
const ACCENT_COLOR_VARIANT: Record<HeroMetricSemanticAccent, ColorVariant> = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'error',
  info: 'info',
  neutral: 'secondary',
}

/**
 * Whether a string/number input renders as text (React renders nothing for
 * `null`, booleans and the empty string).
 *
 * @param value - The input value.
 * @returns True when it renders as text.
 */
const hasText = (value: unknown): boolean =>
  typeof value === 'number' || (typeof value === 'string' && value !== '')

/**
 * HeroMetricCard component.
 *
 * Top-of-dashboard hero metric card — a large value under a small uppercase
 * label, with an optional unit, trend chip, subtitle, right-hand progress ring
 * or icon, a semantic (or raw CSS) top-edge accent bar, an interactive button
 * role, and a loading state that replaces the value with a localized status
 * line. The host IS the Card `div` (`div[mol-hero-metric-card]`), matching
 * React's root exactly: same classes, same inline style, same role/tab order.
 *
 * Node props (`title`, `value`, `unit`, `subtitle`, `progressRing`, `icon`) are
 * projected content (`[slot=<name>]`) or plain string inputs. Angular
 * projection needs the optional capture points mounted, so the wrapper regions
 * render optimistically and the component's placement function reconciles
 * them with React's conditional DOM.
 */
@Component({
  selector: 'div[mol-hero-metric-card]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [HeroMetricTrendChip],
  inputs: [
    'title',
    'value',
    'unit',
    'trend',
    'subtitle',
    'progressRing',
    'icon',
    'accent',
    'onClick',
    'loading',
    'className',
    'dataMolId',
  ],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
    '[attr.role]': 'clickable ? "button" : null',
    '[attr.tabindex]': 'clickable ? 0 : null',
    '(click)': 'handleClick($event)',
    '(keydown)': 'handleKeyDown($event)',
  },
  // prettier-ignore
  template: `@if (accent) {<span #accentEl aria-hidden="true" [class]="accentClasses()" [style]="accentStyle()"></span>}<div [class]="paddingClasses()"><div [class]="rowClasses()" [attr.aria-busy]="loading ? 'true' : null"><div [class]="stackClasses()"><span [class]="titleClasses()">@if (hasTitle) {{{ title }}}<ng-content select="[slot=title]"></ng-content></span>@if (loading) {<span [class]="loadingClasses()" role="status" aria-live="polite">{{ loadingLabel() }}</span>} @else {<div [class]="valueRowClasses()"><span [class]="valueClasses()">@if (hasValue) {{{ value }}}<ng-content select="[slot=value]"></ng-content></span><span #unitWrap [class]="unitClasses()">@if (hasUnitInput) {{{ unit }}}<ng-content select="[slot=unit]"></ng-content></span></div>}@if (!loading && trend) {<span mol-hero-metric-trend-chip [trend]="trend"></span>}<span #subtitleWrap [class]="subtitleClasses()">@if (hasSubtitleInput) {{{ subtitle }}}<ng-content select="[slot=subtitle]"></ng-content></span></div><div #rightWrap [class]="rightClasses()">@if (hasRightText) {{{ rightValue }}}<span #ringSlot><ng-content select="[slot=progressRing]"></ng-content></span><span #iconSlot><ng-content select="[slot=icon]"></ng-content></span></div></div></div>`,
})
export class HeroMetricCard {
  /** Title / label for the metric — a string input, or `[slot=title]` content. */
  title?: unknown
  /** The large primary value — a string input, or `[slot=value]` content. */
  value?: unknown
  /** Optional unit — a string input, or `[slot=unit]` content. */
  unit?: unknown
  /** Optional trend chip rendered below the value. */
  trend?: HeroMetricTrend
  /** Optional supporting text — a string input, or `[slot=subtitle]` content. */
  subtitle?: unknown
  /** Optional progress ring or sparkline — `[slot=progressRing]` content. */
  progressRing?: unknown
  /** Optional leading icon — `[slot=icon]` content. */
  icon?: unknown
  /** Optional accent border color (top edge). */
  accent?: HeroMetricAccent
  /** Optional click handler — turns the card into a button-role interactive. */
  onClick?: (event?: MouseEvent) => void
  /** When `true`, swaps the value for a localized loading line. */
  loading?: boolean
  /** Extra classes on the outer Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** The optional unit wrapper (its projected content is read each placement). */
  @ViewChild('unitWrap') private unitWrap?: ElementRef<HTMLElement>
  /** The optional subtitle wrapper (its projected content is read each placement). */
  @ViewChild('subtitleWrap') private subtitleWrap?: ElementRef<HTMLElement>
  /** The right-hand slot's wrapper (its projected content is read each placement). */
  @ViewChild('rightWrap') private rightWrap?: ElementRef<HTMLElement>
  /** The progress-ring capture point (removed once its nodes are placed). */
  @ViewChild('ringSlot') private ringSlot?: ElementRef<HTMLElement>
  /** The icon capture point (removed once its nodes are placed). */
  @ViewChild('iconSlot') private iconSlot?: ElementRef<HTMLElement>

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /** Whether a `[slot=unit]` projection landed (set from its projected content on each placement). */
  private readonly unitProjected = signal(true)
  /** Whether a `[slot=subtitle]` projection landed (set from its projected content on each placement). */
  private readonly subtitleProjected = signal(true)
  /** Whether a `[slot=progressRing]` projection landed (set from its projected content on each placement). */
  private readonly ringProjected = signal(true)
  /** Whether a `[slot=icon]` projection landed (set from its projected content on each placement). */
  private readonly iconProjected = signal(true)

  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
  }

  /**
   * Reads the optional regions' projected content and settles the right-hand
   * slot: React renders a region only when a prop or a projection supplies it,
   * and picks `progressRing` over `icon`; Angular projection needed both
   * capture points mounted, so the loser is withheld here and the winner's
   * content is placed into the wrapper (React has no capture element).
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const unit = this.unitWrap?.nativeElement
    this.unitProjected.set(this.hasUnitInput || hasContent(unit))
    setElementPresent(unit, this.showUnit())

    const subtitle = this.subtitleWrap?.nativeElement
    this.subtitleProjected.set(!this.loading && (this.hasSubtitleInput || hasContent(subtitle)))
    setElementPresent(subtitle, this.showSubtitle())

    this.settleRight(hasContent)
    setElementPresent(this.rightWrap?.nativeElement, this.showRight())
  }

  /**
   * Whether the card is interactive (`onClick` supplied): React renders the
   * button role and the tab stop only then.
   * @returns True when clickable.
   */
  get clickable(): boolean {
    return typeof this.onClick === 'function'
  }

  /**
   * Whether a text title input renders.
   * @returns True when the title input renders as text.
   */
  get hasTitle(): boolean {
    return hasText(this.title)
  }

  /**
   * Whether a text value input renders.
   * @returns True when the value input renders as text.
   */
  get hasValue(): boolean {
    return hasText(this.value)
  }

  /**
   * Whether a text unit input renders (React's `unit !== undefined && unit !== null`).
   * @returns True when the unit input renders (an empty string included).
   */
  get hasUnitInput(): boolean {
    return this.unit !== undefined && this.unit !== null
  }

  /**
   * Whether a text subtitle input renders (React's truthiness test).
   * @returns True when the subtitle input renders as text.
   */
  get hasSubtitleInput(): boolean {
    return hasText(this.subtitle)
  }

  /**
   * React's `progressRing ?? icon`.
   * @returns The right-hand input, or undefined.
   */
  get rightValue(): unknown {
    return this.progressRing ?? this.icon
  }

  /**
   * Whether the right-hand input renders as text (React's truthiness test).
   * @returns True when it renders as text.
   */
  get hasRightText(): boolean {
    const value = this.rightValue
    return value != null && value !== false && value !== ''
  }

  /**
   * Whether the unit span renders: a text input, or a projected `[slot=unit]`.
   * @returns True when the unit shows.
   */
  showUnit(): boolean {
    return this.hasUnitInput || this.unitProjected()
  }

  /**
   * Whether the subtitle span renders (not while loading).
   * @returns True when the subtitle shows.
   */
  showSubtitle(): boolean {
    return !this.loading && (this.hasSubtitleInput || this.subtitleProjected())
  }

  /**
   * Whether the right-hand wrapper renders: a text input, or a projected slot.
   * @returns True when the right-hand slot shows.
   */
  showRight(): boolean {
    return this.hasRightText || this.ringProjected() || this.iconProjected()
  }

  /**
   * The translated loading line (React's `hero-metric-card.loading` key).
   * @returns The loading label.
   */
  loadingLabel(): string {
    return this.i18n.t('hero-metric-card.loading', {}, { defaultValue: 'Loading metric…' })
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The resolved accent bar (`{ className }`, `{ backgroundColor }`, or none).
   * @returns The bar's color class and/or inline background color.
   */
  accentBar(): { className?: string; backgroundColor?: string } | undefined {
    if (!this.accent) return undefined
    const variant = ACCENT_COLOR_VARIANT[this.accent as HeroMetricSemanticAccent]
    if (variant) return { className: this.cm().progressColor(variant) }
    return { backgroundColor: this.accent }
  }

  /**
   * The accent bar's class list (React's `cm.cn(accentBar.className)`).
   * @returns The class string.
   */
  accentClasses(): string {
    return this.cm().cn(this.accentBar()?.className)
  }

  /**
   * The accent bar's inline style (React's `{ display, height, backgroundColor }`).
   * @returns The style attribute text, or null.
   */
  accentStyle(): string | null {
    return styleText({
      display: 'block',
      height: '4px',
      backgroundColor: this.accentBar()?.backgroundColor,
    })
  }

  /**
   * The host's class list (React's Card: elevated, no padding, interactive
   * classes when clickable, then `className`).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(
      cm.card({ variant: 'elevated' }),
      this.clickable && cm.cardInteractive,
      cm.cn(this.className),
    )
  }

  /**
   * The host's inline style: `overflow: hidden` only when an accent bar is drawn.
   * @returns The style attribute text, or null.
   */
  hostStyle(): string | null {
    return this.accent ? styleText({ overflow: 'hidden' }) : null
  }

  /**
   * The inner wrapper's class list (React's `cm.cardPadding('md')`).
   * @returns The class string.
   */
  paddingClasses(): string {
    return this.cm().cardPadding('md')
  }

  /**
   * The value row's class list (`cm.flex({ justify: 'between', align: 'center', gap: 'md' })`).
   * @returns The class string.
   */
  rowClasses(): string {
    const cm = this.cm()
    return cm.flex({ justify: 'between', align: 'center', gap: 'md' })
  }

  /**
   * The left column's class list (`cm.stack(2)`).
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().cn(this.cm().stack(2))
  }

  /**
   * The title's class list (xs, bold, uppercase, wide tracking, muted).
   * @returns The class string.
   */
  titleClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.textSize('xs'),
      cm.fontWeight('bold'),
      cm.uppercase,
      cm.trackingWide,
      cm.textMuted,
    )
  }

  /**
   * The loading line's class list (`cm.textSize('5xl')` + bold).
   * @returns The class string.
   */
  loadingClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('5xl'), cm.fontWeight('bold'))
  }

  /**
   * The value row's class list (`cm.flex({ align: 'baseline', gap: 'xs' })`).
   * @returns The class string.
   */
  valueRowClasses(): string {
    return this.cm().flex({ align: 'baseline', gap: 'xs' })
  }

  /**
   * The value's class list (5xl, extrabold, `cm.heroMetricCardValue`).
   * @returns The class string.
   */
  valueClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('5xl'), cm.fontWeight('extrabold'), cm.heroMetricCardValue)
  }

  /**
   * The unit's class list (`cm.textSize('lg')` + medium + muted).
   * @returns The class string.
   */
  unitClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('lg'), cm.fontWeight('medium'), cm.textMuted)
  }

  /**
   * The subtitle's class list (`cm.textSize('sm')` + muted).
   * @returns The class string.
   */
  subtitleClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('sm'), cm.textMuted)
  }

  /**
   * The right-hand wrapper's class list (`cm.flex({ align: 'center', justify: 'center' })`).
   * @returns The class string.
   */
  rightClasses(): string {
    return this.cm().flex({ align: 'center', justify: 'center' })
  }

  /**
   * Forwards a native click on the card to the `onClick` input (React's Card
   * hands its DOM click handler the event).
   *
   * @param event - The click event.
   */
  handleClick(event: MouseEvent): void {
    this.onClick?.(event)
  }

  /**
   * Enter and Space activate an interactive card the way they activate a
   * native button — by clicking it. Keys pressed in a control inside the card
   * belong to that control.
   *
   * @param event - The key event.
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.clickable || event.target !== event.currentTarget) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    ;(event.currentTarget as HTMLElement).click()
  }

  /**
   * Settles the right-hand slot from the capture points: only when no text
   * input supplies it, a projected `progressRing` wins over a projected
   * `icon`; the winner's content is rendered directly in the wrapper (React has
   * no capture element) and both capture points are taken out of the DOM.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private settleRight(hasContent: SlotReader): void {
    const wrap = this.rightWrap?.nativeElement
    const ring = this.ringSlot?.nativeElement
    const icon = this.iconSlot?.nativeElement
    const ringHas = hasContent(ring)
    const iconHas = hasContent(icon)
    this.ringProjected.set(ringHas)
    this.iconProjected.set(iconHas)
    if (!wrap || !ring || !icon) return
    const winner = ringHas ? ring : iconHas ? icon : null
    const loser = ringHas ? icon : iconHas ? ring : null
    if (winner) {
      placeContent(winner, wrap, winner)
      setElementPresent(winner, false)
    }
    if (loser) {
      placeContent(loser, null)
      setElementPresent(loser, false)
    }
  }
}
