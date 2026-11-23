/**
 * ComparisonRow component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type ElementRef, type TemplateRef, ViewChild } from '@angular/core'

import { MolPlacement, setElementPresent, usePlacement } from '@molecule/app-angular'
import type { ColorVariant, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

const ARROW = (n: number): string => (n > 0 ? '▲' : n < 0 ? '▼' : '–')

/**
 * The semantic tone colouring the delta: the theme's success green for a
 * rise, its error red for a fall, its secondary grey for no change.
 */
const TONE = (n: number): ColorVariant => (n > 0 ? 'success' : n < 0 ? 'error' : 'secondary')

/**
 * ComparisonRow component.
 *
 * Period-over-period stat comparison row — current value, optional previous
 * value, and a coloured delta% chip. The host IS the root `<div>`
 * (`div[mol-comparison-row]`), matching React's root exactly. The delta's
 * tone class and the layout and type classes come from the ClassMap bond.
 * Same props, same
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
  hostDirectives: [MolPlacement],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<div [class]="stackClass()">
      <span [class]="labelClass()">@if (hasLabel) {<ng-container>{{ label }}</ng-container>}<ng-content select="[slot=label]" /></span><span #periodSpan [class]="cm().textSize('xs')">@if (hasPeriodLabel) {<ng-container>{{ periodLabel }}</ng-container>}<ng-content select="[slot=periodLabel]" /></span>
    </div>
    <div [class]="valuesClass()">
      <span [class]="currentClass()">@if (hasCurrent) {<ng-container>{{ current }}</ng-container>}<ng-content select="[slot=current]" /></span><span #previousSpan [class]="cm().cn(cm().textSize('xs'))" [style.text-decoration]="'line-through'" [style.opacity]="0.6">@if (hasPrevious) {<ng-container>{{ previous }}</ng-container>}<ng-content select="[slot=previous]" /></span>@if (hasDelta) {<span [class]="deltaClass()">@if (formatDelta) {<ng-container [ngTemplateOutlet]="formatDelta" [ngTemplateOutletContext]="deltaContext()" />}@else {<ng-container>{{ arrow() }} {{ pct() }}%</ng-container>}</span>}
    </div>`,
})
export class ComparisonRow {
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

  /** The period-label span (always in the label stack; detached while it has nothing to render). */
  @ViewChild('periodSpan', { static: true }) private periodSpan?: ElementRef<HTMLSpanElement>
  /** The previous-value span (always in the values row; detached while it has nothing to render). */
  @ViewChild('previousSpan', { static: true }) private previousSpan?: ElementRef<HTMLSpanElement>

  /**
   * Keeps each optional span on the page only while it renders a text input or
   * projected content, re-decided whenever either changes (a slot taken away
   * and given back included).
   */
  constructor() {
    usePlacement((hasContent) => {
      const period = this.periodSpan?.nativeElement
      setElementPresent(period, this.hasPeriodLabel || (period ? hasContent(period) : false))
      const previous = this.previousSpan?.nativeElement
      setElementPresent(previous, this.hasPrevious || (previous ? hasContent(previous) : false))
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
   * The delta chip's class, with the tone of the current direction.
   * @returns The class string.
   */
  deltaClass(): string {
    return this.cm().cn(
      this.cm().textSize('xs'),
      this.cm().fontWeight('semibold'),
      this.cm().textTone(TONE(this.deltaPct ?? 0)),
    )
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
   * The template outlet context for a custom formatter.
   * @returns The delta as `$implicit` and `a0`.
   */
  deltaContext(): Record<string, unknown> {
    const delta = this.deltaPct
    return { $implicit: delta, a0: delta, a1: undefined, a2: undefined }
  }
}
