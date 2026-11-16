/**
 * GpaCard component (React parity).
 *
 * @module
 */

import {
  type AfterViewChecked,
  Component,
  type ElementRef,
  signal,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { GpaScale, GpaTrend } from './types.js'
import { defaultGpaMax, formatGpa } from './utilities.js'

/** A node-valued field (React's `ReactNode`): text, or an `ng-template` reference. */
type GradeNode = TemplateRef<unknown> | string | number

/**
 * Whether a node is something a caller can see (an element, or a non-blank
 * text node).
 *
 * @param node - The DOM node.
 * @returns True when it renders anything.
 */
const hasRenderable = (node: Node): boolean =>
  node.nodeType === Node.ELEMENT_NODE ||
  (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0)

/**
 * Whether an element carries renderable content (a projected slot landed, or
 * its text input rendered).
 *
 * @param el - The element.
 * @returns True when its children render anything.
 */
const hasRenderableContent = (el: Element | undefined | null): boolean =>
  el ? Array.from(el.childNodes).some(hasRenderable) : false

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
 * GpaCard component.
 *
 * Hero card displaying the user's GPA — large primary value, "out of" caption,
 * and optional trend chip. The host IS the Card `div` (`div[mol-gpa-card]`),
 * matching React's root exactly: same classes, same region role, same aria
 * label. The `trendLabel` node prop is a text input or projected content
 * (`[slot=trendLabel]`); Angular projection needs its capture point mounted, so
 * the label region renders optimistically and
 * {@link GpaCard.ngAfterViewChecked} reconciles it with React's conditional DOM.
 */
@Component({
  selector: 'div[mol-gpa-card]',
  standalone: true,
  inputs: ['gpa', 'scale', 'max', 'trend', 'trendLabel', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<div [class]="innerClasses()" data-mol-id="gpa-card" role="region" [attr.aria-label]="titleText()"><span [class]="titleClasses()" data-mol-id="gpa-card-title">{{ titleText() }}</span><div [class]="valueRowClasses()"><span [class]="valueClasses()" data-mol-id="gpa-card-value">{{ formatted() }}</span><span [class]="outOfClasses()" data-mol-id="gpa-card-out-of">{{ outOfText() }}</span></div>@if (trendText()) {<div [class]="trendRowClasses()" data-mol-id="gpa-card-trend" [attr.data-trend]="trend"><span aria-hidden="true">{{ trendGlyph() }}</span><span [class]="smallClasses()" data-mol-id="gpa-card-trend-text">{{ trendText() }}</span>@if (showTrendLabel()) {<span #trendLabelWrap [class]="smallClasses()" data-mol-id="gpa-card-trend-label">@if (hasTrendLabelInput) {{{ trendLabel }}}<ng-content select="[slot=trendLabel]"></ng-content></span>}</div>}`,
})
export class GpaCard implements AfterViewChecked {
  /** The numeric GPA value (or percentage when `scale='percentage'`). */
  gpa = 0
  /** Which scale `gpa` is expressed on. */
  scale: GpaScale = '4.0'
  /** Override the maximum value shown in the "out of" caption. */
  max?: number
  /** Optional trend chip — render up/down/flat with localized label. */
  trend?: GpaTrend
  /** Optional caption below the trend: text, or `[slot=trendLabel]` content. */
  trendLabel?: GradeNode
  /** Extra classes merged onto the root element. */
  className?: string

  /** The trend-label wrapper (its projected content is read each check). */
  @ViewChild('trendLabelWrap') private trendLabelWrap?: ElementRef<HTMLElement>

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /** Whether a `[slot=trendLabel]` projection landed (true until the view proves otherwise). */
  private readonly trendLabelProjected = signal(true)

  /**
   * Reconciles the trend-label region with React's conditional DOM: React
   * renders the label span only when `trendLabel` is supplied, and Angular
   * projection needs its capture point mounted first.
   */
  ngAfterViewChecked(): void {
    const wrap = this.trendLabelWrap?.nativeElement
    if (!wrap) return
    const has = hasRenderableContent(wrap)
    if (has !== this.trendLabelProjected()) this.trendLabelProjected.set(has)
  }

  /**
   * Whether a text trend-label input renders (React's truthiness test).
   * @returns True when the label input renders as text.
   */
  get hasTrendLabelInput(): boolean {
    return hasText(this.trendLabel)
  }

  /**
   * Whether the label span renders: a text input, or a projected slot.
   * @returns True when the label shows.
   */
  showTrendLabel(): boolean {
    return this.hasTrendLabelInput || this.trendLabelProjected()
  }

  /**
   * React's ceiling: an explicit positive `max`, otherwise the scale default.
   * @returns The maximum value shown in the "out of" caption.
   */
  ceiling(): number {
    return typeof this.max === 'number' && this.max > 0 ? this.max : defaultGpaMax(this.scale)
  }

  /**
   * The formatted GPA value.
   * @returns The formatted value.
   */
  formatted(): string {
    return formatGpa(this.gpa, this.scale)
  }

  /**
   * The translated title.
   * @returns The "GPA" label.
   */
  titleText(): string {
    return this.i18n.t('gradebook.gpa.title', {}, { defaultValue: 'GPA' })
  }

  /**
   * The translated "out of" caption with the formatted ceiling.
   * @returns The caption text.
   */
  outOfText(): string {
    return this.i18n.t(
      'gradebook.gpa.outOf',
      { max: formatGpa(this.ceiling(), this.scale) },
      { defaultValue: 'out of {{max}}' },
    )
  }

  /**
   * The translated trend label, or null when no known trend is set.
   * @returns The label text, or null.
   */
  trendText(): string | null {
    const key =
      this.trend === 'up'
        ? 'gradebook.gpa.trend.up'
        : this.trend === 'down'
          ? 'gradebook.gpa.trend.down'
          : this.trend === 'flat'
            ? 'gradebook.gpa.trend.flat'
            : null
    if (!key) return null
    const fallback =
      this.trend === 'up' ? 'Trending up' : this.trend === 'down' ? 'Trending down' : 'Steady'
    return this.i18n.t(key, {}, { defaultValue: fallback })
  }

  /**
   * The trend chip's glyph.
   * @returns The arrow for the current trend.
   */
  trendGlyph(): string {
    return this.trend === 'up' ? '↑' : this.trend === 'down' ? '↓' : '→'
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The host's class list (React's Card: elevated variant, default padding,
   * then `className`).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.card({ variant: 'elevated' }), cm.cardPadding('md'), this.className)
  }

  /**
   * The inner wrapper's class list (`cm.cn(cm.stack(2))`).
   * @returns The class string.
   */
  innerClasses(): string {
    return this.cm().cn(this.cm().stack(2))
  }

  /**
   * The title's class list (xs + semibold).
   * @returns The class string.
   */
  titleClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))
  }

  /**
   * The value row's class list (`cm.flex({ align: 'baseline', gap: 'sm' })`).
   * @returns The class string.
   */
  valueRowClasses(): string {
    return this.cm().flex({ align: 'baseline', gap: 'sm' })
  }

  /**
   * The value's class list (3xl + bold).
   * @returns The class string.
   */
  valueClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))
  }

  /**
   * The "out of" caption's class list (`cm.textSize('sm')`).
   * @returns The class string.
   */
  outOfClasses(): string {
    return this.cm().textSize('sm')
  }

  /**
   * The trend row's class list (`cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  trendRowClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The trend text / label's class list (`cm.textSize('xs')`).
   * @returns The class string.
   */
  smallClasses(): string {
    return this.cm().textSize('xs')
  }
}
