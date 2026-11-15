/**
 * ComparisonRow component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  Component,
  type ElementRef,
  signal,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

const ARROW = (n: number): string => (n > 0 ? '▲' : n < 0 ? '▼' : '–')
const COLOR = (n: number): string => (n > 0 ? '#22c55e' : n < 0 ? '#ef4444' : '#94a3b8')

/**
 * Whether a projected node renders anything (an element, or text with
 * content beyond whitespace).
 *
 * @param node - The projected node.
 * @returns True when it renders.
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
const hasRenderableContent = (el: HTMLElement): boolean =>
  Array.from(el.childNodes).some(hasRenderable)

/**
 * ComparisonRow component.
 *
 * Period-over-period stat comparison row — current value, optional previous
 * value, and a coloured delta% chip. The host IS the root `<div>`
 * (`div[mol-comparison-row]`), matching React's root exactly. The delta color
 * is applied inline through style bindings (the CSSOM, as react-dom does);
 * the layout and type classes come from the ClassMap bond. Same props, same
 * DOM as `@molecule/app-comparison-row-react`'s `ComparisonRow`. Node-valued
 * `label`, `current`, `previous` and `periodLabel` content is projected
 * (`[slot=<name>]`); a string or number input renders as text. A custom
 * `formatDelta` is a template receiving the delta as `$implicit` / `a0`;
 * without one the default arrow + percentage renders.
 */
@Component({
  selector: 'div[mol-comparison-row]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['label', 'current', 'previous', 'deltaPct', 'formatDelta', 'periodLabel', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<div [class]="stackClass()">
      <span [class]="labelClass()">@if (hasLabel) {<ng-container>{{ label }}</ng-container>}<ng-content select="[slot=label]" /></span>@if (showPeriodLabel) {<span #periodSpan [class]="cm().textSize('xs')">@if (hasPeriodLabel) {<ng-container>{{ periodLabel }}</ng-container>}<ng-content select="[slot=periodLabel]" /></span>}
    </div>
    <div [class]="valuesClass()">
      <span [class]="currentClass()">@if (hasCurrent) {<ng-container>{{ current }}</ng-container>}<ng-content select="[slot=current]" /></span>@if (showPrevious) {<span #previousSpan [class]="cm().cn(cm().textSize('xs'))" [style.text-decoration]="'line-through'" [style.opacity]="0.6">@if (hasPrevious) {<ng-container>{{ previous }}</ng-container>}<ng-content select="[slot=previous]" /></span>}@if (hasDelta) {<span [class]="deltaClass()" [style.color]="deltaColor()">@if (formatDelta) {<ng-container [ngTemplateOutlet]="formatDelta" [ngTemplateOutletContext]="deltaContext()" />}@else {<ng-container>{{ arrow() }} {{ pct() }}%</ng-container>}</span>}
    </div>`,
})
export class ComparisonRow implements AfterViewInit {
  /** Label for the metric (e.g. "Revenue"): text, or `[slot=label]` content. */
  label?: unknown
  /** Current period value (formatted): text, or `[slot=current]` content. */
  current?: unknown
  /** Previous period value (formatted): text, or `[slot=previous]` content. */
  previous?: unknown
  /** Numeric delta% — drives direction + color when present. */
  deltaPct?: number
  /** Custom delta formatter template (receives the delta as `$implicit` / `a0`). */
  formatDelta?: TemplateRef<unknown> | null
  /** Optional sub-text ("vs. last week"): text, or `[slot=periodLabel]` content. */
  periodLabel?: unknown
  /** Extra classes. */
  className?: string

  /** The optional period-label span (projected content lands here; read once). */
  @ViewChild('periodSpan') private periodSpan?: ElementRef<HTMLSpanElement>
  /** The optional previous-value span (projected content lands here; read once). */
  @ViewChild('previousSpan') private previousSpan?: ElementRef<HTMLSpanElement>

  /**
   * Whether a `[slot=periodLabel]` projection landed (true until the first
   * view proves otherwise).
   */
  private readonly periodProjected = signal(true)
  /**
   * Whether a `[slot=previous]` projection landed (true until the first view
   * proves otherwise).
   */
  private readonly previousProjected = signal(true)

  /**
   * Whether the period-label span renders: React's `periodLabel && …` on the
   * text input, or projected `[slot=periodLabel]` content. A plain getter, so
   * every change detection pass follows the inputs (a computed would cache on
   * its signal dependency alone and miss a later text input).
   * @returns True when the sub-text shows.
   */
  get showPeriodLabel(): boolean {
    return this.hasPeriodLabel || this.periodProjected()
  }

  /**
   * Whether the previous-value span renders: React's `previous !== undefined`
   * on the text input, or projected `[slot=previous]` content.
   * @returns True when the struck-through value shows.
   */
  get showPrevious(): boolean {
    return this.hasPrevious || this.previousProjected()
  }

  /**
   * Reads the optional spans' first render: when neither a text input nor
   * projected content landed, React would not render the span at all, so the
   * optimistic render is withdrawn. View queries resolve only at view init,
   * and a projected slot's content is in place by then.
   */
  ngAfterViewInit(): void {
    const period = this.periodSpan?.nativeElement
    if (period && !this.hasPeriodLabel && !hasRenderableContent(period)) {
      this.periodProjected.set(false)
    }
    const previous = this.previousSpan?.nativeElement
    if (previous && !this.hasPrevious && !hasRenderableContent(previous)) {
      this.previousProjected.set(false)
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
   * Computes the root class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'baseline', justify: 'between', gap: 'md' }),
      this.className,
    )
  }

  /**
   * The left stack's class.
   * @returns The class string.
   */
  stackClass(): string {
    return this.cm().stack(0)
  }

  /**
   * The label span's class.
   * @returns The class string.
   */
  labelClass(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('semibold'))
  }

  /**
   * The values row's class.
   * @returns The class string.
   */
  valuesClass(): string {
    return this.cm().flex({ align: 'baseline', gap: 'sm' })
  }

  /**
   * The current-value span's class.
   * @returns The class string.
   */
  currentClass(): string {
    return this.cm().cn(this.cm().textSize('lg'), this.cm().fontWeight('bold'))
  }

  /**
   * The delta chip's class.
   * @returns The class string.
   */
  deltaClass(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('semibold'))
  }

  /**
   * Whether a text label input is present (a projected label is not).
   * @returns True when the label input renders as text.
   */
  get hasLabel(): boolean {
    return this.label !== undefined && this.label !== null
  }

  /**
   * Whether a text current-value input is present.
   * @returns True when the current input renders as text.
   */
  get hasCurrent(): boolean {
    return this.current !== undefined && this.current !== null
  }

  /**
   * Whether the previous value renders as text: React's
   * `previous !== undefined`.
   * @returns True when the struck-through value shows.
   */
  get hasPrevious(): boolean {
    return this.previous !== undefined
  }

  /**
   * Whether the period label renders as text: React's `periodLabel && …`
   * truthiness.
   * @returns True when the sub-text shows.
   */
  get hasPeriodLabel(): boolean {
    return this.periodLabel !== undefined && this.periodLabel !== null && this.periodLabel !== ''
  }

  /**
   * Whether the delta chip renders.
   * @returns True when `deltaPct` is set.
   */
  get hasDelta(): boolean {
    return this.deltaPct !== undefined
  }

  /**
   * The delta's direction arrow.
   * @returns `'▲'`, `'▼'` or `'–'`.
   */
  arrow(): string {
    return ARROW(this.deltaPct ?? 0)
  }

  /**
   * The delta's magnitude, one decimal place (React's
   * `Math.abs(deltaPct).toFixed(1)`).
   * @returns The formatted magnitude.
   */
  pct(): string {
    return this.deltaPct === undefined ? '' : Math.abs(this.deltaPct).toFixed(1)
  }

  /**
   * The delta chip's inline color of the current direction.
   * @returns The hex color.
   */
  deltaColor(): string {
    return COLOR(this.deltaPct ?? 0)
  }

  /**
   * The template outlet context for a custom formatter.
   * @returns The delta as `$implicit` and `a0`.
   */
  deltaContext(): Record<string, unknown> {
    const delta = this.deltaPct
    return { $implicit: delta, a0: delta, a1: undefined, a2: undefined }
  }
}
