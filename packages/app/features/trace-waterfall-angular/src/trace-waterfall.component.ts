/**
 * TraceWaterfall component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, ElementRef, inject, TemplateRef } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  useLocale,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import {
  AXIS_TICK_COUNT,
  BAR_HEIGHT_PX,
  DEFAULT_BAR_COLOR,
  DEPTH_INDENT_PX,
  LABEL_COLUMN_PX,
  ROW_HEIGHT_PX,
  STATUS_COLOR,
} from './constants.js'
import { translateDuration } from './format.js'
import { layoutSpans, serviceColor } from './layout.js'
import type { Span, SpanLayout, SpanRow } from './types.js'

/** One axis tick: its percentage `left` and the duration it labels. */
interface AxisTick {
  /** The tick's horizontal position, as a CSS percentage. */
  left: string
  /** The duration label the tick carries. */
  label: string
}

/**
 * TraceWaterfall component.
 *
 * Datadog/Jaeger-style distributed-trace waterfall: each span renders as a
 * horizontal bar positioned by `startTime`, scaled to the trace's total
 * duration and indented by parent depth, under a time axis. Service name shows
 * as a colored tag beside the operation name; bar color encodes status.
 *
 * React's root is the `<div role="region">` when there are rows, the bare
 * `emptyState` node when the trace is empty and a node was given, and the
 * `<div role="status">` fallback otherwise — three different roots, so the
 * rendered content stands in front of the host's place and the host itself
 * leaves the page (`placeContentBefore` + `setElementPresent`). The empty state
 * arrives as a node-valued input (`emptyState`, a `TemplateRef`).
 *
 * Styling is fully ClassMap-driven for layout. Only color attributes (status
 * colors, service-tag colors, bar fill) and pixel-perfect axis geometry use
 * inline styles — properties ClassMap does not model.
 */
@Component({
  selector: 'mol-trace-waterfall',
  standalone: true,
  imports: [NgTemplateOutlet],
  hostDirectives: [MolPlacement],
  inputs: ['spans', 'rootSpanId', 'selectedSpanId', 'onSpanClick', 'emptyState', 'className'],
  // prettier-ignore
  template: `@if (rows().length === 0) {@if (emptyTemplate(); as emptyTpl) {<ng-container [ngTemplateOutlet]="emptyTpl" />} @else {<div [class]="emptyClasses()" data-mol-id="trace-waterfall-empty" role="status">{{ emptyLabel() }}</div>}} @else {<div [class]="rootClasses()" role="region" [attr.aria-label]="ariaLabel()" data-mol-id="trace-waterfall"><div [class]="axisClasses()" data-mol-id="trace-waterfall-axis"><div [style]="totalStyle()">{{ totalLabel() }}</div><div [style]="tickBoxStyle()">@for (tick of ticks(); track $index) {<div [style]="tickStyle(tick)" data-mol-id="trace-waterfall-axis-tick">{{ tick.label }}</div>}</div></div><div role="tree" data-mol-id="trace-waterfall-rows">@for (row of rows(); track row.span.id) {<div [class]="rowClasses()" [style]="rowStyle()" role="treeitem" [attr.aria-level]="row.depth + 1" [attr.aria-selected]="selectedSpanId === row.span.id ? 'true' : 'false'" [attr.aria-label]="rowAriaLabel(row)" [attr.tabindex]="interactive() ? 0 : -1" (click)="rowClick(row)" (keydown)="rowKeydown(row, $event)" data-mol-id="trace-waterfall-row" [attr.data-span-id]="row.span.id"><div [class]="labelClasses()" [style]="labelStyle(row)">@if (row.span.service) {<span data-mol-id="trace-waterfall-service-tag" [style]="tagStyle(row)">{{ row.span.service }}</span>}<span [style]="nameStyle()" data-mol-id="trace-waterfall-name">{{ row.span.name }}</span></div><div [style]="barBoxStyle()"><div data-mol-id="trace-waterfall-bar" [style]="barStyle(row)"></div><div data-mol-id="trace-waterfall-duration" [style]="durationStyle(row)">{{ durationText(row) }}</div></div></div>}</div></div>}`,
})
export class TraceWaterfall {
  /** Flat list of spans; the tree is derived from `parentId` references. */
  spans: Span[] = []

  /** Optional root span id to focus the view on a single subtree. */
  rootSpanId?: string

  /** Optional id of the currently selected span (`aria-selected` on that row). */
  selectedSpanId?: string

  /** Click handler invoked when a span row (label or bar) is selected. */
  onSpanClick?: (span: Span) => void

  /** Empty-state content, as an input (a node passed as a prop). */
  emptyState?: unknown

  /** Extra classes merged onto the root via `cm.cn`. */
  className?: string

  /** The i18n accessors (React's `useTranslation()`). */
  private readonly i18n = useTranslation()

  /** The app's active locale, so the tick and badge labels follow a locale switch. */
  private readonly activeLocale = useLocale()

  /** The component's host element (React renders no element of its own). */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    // React's root is one of three branch roots (or the bare empty-state node): it renders
    // in front of the host's place and the host leaves the page.
    usePlacement(() => {
      placeContentBefore(this.host.nativeElement, this.host.nativeElement)
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
   * The layout of the visible spans (React's `useMemo` over the same inputs).
   * @returns The rows, in render order, with the trace's time bounds.
   */
  layout(): SpanLayout {
    return layoutSpans(this.spans ?? [], this.rootSpanId)
  }

  /**
   * The visible rows.
   * @returns The rows in render order.
   */
  rows(): SpanRow[] {
    return this.layout().rows
  }

  /**
   * The empty state as an input template (a node passed as a prop rather than
   * projected content), when there is one.
   * @returns The empty-state template, or null.
   */
  emptyTemplate(): TemplateRef<unknown> | null {
    return this.emptyState instanceof TemplateRef ? this.emptyState : null
  }

  /**
   * Whether rows respond to clicks and keys (React's `Boolean(onSpanClick)`).
   * @returns True when a click handler is supplied.
   */
  interactive(): boolean {
    return Boolean(this.onSpanClick)
  }

  /**
   * The wrapper class list (`cm.stack(1)` + `className`).
   * @returns The class string.
   */
  rootClasses(): string {
    return this.cm().cn(this.cm().stack(1), this.className)
  }

  /**
   * The fallback status line's class list.
   * @returns The class string.
   */
  emptyClasses(): string {
    return this.cm().cn(this.cm().sp('p', 3), this.cm().textSize('sm'), this.className)
  }

  /**
   * The time axis's class list.
   * @returns The class string.
   */
  axisClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center' }), this.cm().textSize('xs'))
  }

  /**
   * A span row's class list.
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center' }))
  }

  /**
   * The label column's class list.
   * @returns The class string.
   */
  labelClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'sm' }), this.cm().textSize('xs'))
  }

  /**
   * The translated empty-trace message.
   * @returns The message in the active locale.
   */
  emptyLabel(): string {
    return this.i18n.t('traceWaterfall.empty', undefined, {
      defaultValue: 'No spans to display.',
    })
  }

  /**
   * The translated region label.
   * @returns The label in the active locale.
   */
  ariaLabel(): string {
    return this.i18n.t('traceWaterfall.aria.label', undefined, {
      defaultValue: 'Distributed trace waterfall',
    })
  }

  /**
   * The translated total-duration label (the axis's left column).
   * @returns The label in the active locale.
   */
  totalLabel(): string {
    return this.i18n.t(
      'traceWaterfall.totalDuration',
      {
        duration: translateDuration(this.layout().traceDuration, this.activeLocale(), this.i18n.t),
      },
      { defaultValue: 'Total: {{duration}}' },
    )
  }

  /**
   * A row's translated accessibility label.
   * @param row - The row.
   * @returns The label in the active locale.
   */
  rowAriaLabel(row: SpanRow): string {
    return this.i18n.t(
      'traceWaterfall.row.aria',
      {
        name: row.span.name,
        service: row.span.service ?? '',
        // The badge and the label both name the same duration, so both go
        // through `translateDuration` and the number follows the app's locale.
        duration: this.durationText(row),
      },
      { defaultValue: '{{service}} · {{name}} · {{duration}}' },
    )
  }

  /**
   * A row's translated duration badge, through `t()` in the active locale
   * (React's badge text).
   * @param row - The row.
   * @returns The badge label in the active locale.
   */
  durationText(row: SpanRow): string {
    return translateDuration(row.span.duration, this.activeLocale(), this.i18n.t)
  }

  /**
   * The axis ticks: `AXIS_TICK_COUNT` evenly spaced positions and labels.
   * @returns The tick list.
   */
  ticks(): AxisTick[] {
    const traceDuration = this.layout().traceDuration
    const out: AxisTick[] = []
    for (let i = 0; i < AXIS_TICK_COUNT; i++) {
      const fraction = i / (AXIS_TICK_COUNT - 1)
      out.push({
        left: `${fraction * 100}%`,
        label: translateDuration(fraction * traceDuration, this.activeLocale(), this.i18n.t),
      })
    }
    return out
  }

  /**
   * Selects a row from a click (React's `onClick`).
   * @param row - The clicked row.
   */
  rowClick(row: SpanRow): void {
    this.onSpanClick?.(row.span)
  }

  /**
   * Activates a row from the keyboard: Enter or Space selects the span, as
   * React's `onKeyDown` does.
   * @param row - The row the key event happened on.
   * @param ev - The DOM key event.
   */
  rowKeydown(row: SpanRow, ev: KeyboardEvent): void {
    if (!this.onSpanClick) return
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault()
      this.onSpanClick(row.span)
    }
  }

  /**
   * The total-label column's inline style (React's fixed 240px box).
   * @returns The style map.
   */
  totalStyle(): Record<string, string> {
    return { width: `${LABEL_COLUMN_PX}px`, 'flex-shrink': '0', opacity: '0.7' }
  }

  /**
   * The tick container's inline style.
   * @returns The style map.
   */
  tickBoxStyle(): Record<string, string> {
    return { position: 'relative', flex: '1', height: '18px' }
  }

  /**
   * A tick mark's inline style.
   * @param tick - The tick.
   * @returns The style map.
   */
  tickStyle(tick: AxisTick): Record<string, string> {
    return {
      position: 'absolute',
      left: tick.left,
      top: '0px',
      transform: 'translateX(-50%)',
      opacity: '0.7',
      'white-space': 'nowrap',
    }
  }

  /**
   * A span row's inline style (React's fixed row height).
   * @returns The style map.
   */
  rowStyle(): Record<string, string> {
    return { height: `${ROW_HEIGHT_PX}px` }
  }

  /**
   * The label column's inline style, indented by depth.
   * @param row - The row.
   * @returns The style map.
   */
  labelStyle(row: SpanRow): Record<string, string> {
    return {
      width: `${LABEL_COLUMN_PX}px`,
      'flex-shrink': '0',
      'padding-left': `${row.depth * DEPTH_INDENT_PX}px`,
      cursor: this.interactive() ? 'pointer' : 'default',
      overflow: 'hidden',
      'white-space': 'nowrap',
      'text-overflow': 'ellipsis',
    }
  }

  /**
   * The service tag's inline style (the service's palette color).
   * @param row - The row.
   * @returns The style map.
   */
  tagStyle(row: SpanRow): Record<string, string> {
    const service = row.span.service
    return {
      display: 'inline-block',
      padding: '0 6px',
      'border-radius': '4px',
      background: service ? serviceColor(service) : '',
      color: '#fff',
      'font-weight': '600',
      'font-size': '10px',
      'line-height': '14px',
      'flex-shrink': '0',
    }
  }

  /**
   * The operation name's inline style.
   * @returns The style map.
   */
  nameStyle(): Record<string, string> {
    return { overflow: 'hidden', 'text-overflow': 'ellipsis' }
  }

  /**
   * The bar container's inline style.
   * @returns The style map.
   */
  barBoxStyle(): Record<string, string> {
    return {
      position: 'relative',
      flex: '1',
      height: `${ROW_HEIGHT_PX}px`,
      cursor: this.interactive() ? 'pointer' : 'default',
    }
  }

  /**
   * The bar's inline style: position and width from the row's fractions.
   * @param row - The row.
   * @returns The style map.
   */
  barStyle(row: SpanRow): Record<string, string> {
    const status = row.span.status
    return {
      position: 'absolute',
      top: `${(ROW_HEIGHT_PX - BAR_HEIGHT_PX) / 2}px`,
      left: `${row.startFraction * 100}%`,
      width: `${Math.max(row.widthFraction * 100, 0.5)}%`,
      height: `${BAR_HEIGHT_PX}px`,
      background: status ? STATUS_COLOR[status] : DEFAULT_BAR_COLOR,
      'border-radius': '2px',
    }
  }

  /**
   * The duration badge's inline style, placed just past the bar's end.
   * @param row - The row.
   * @returns The style map.
   */
  durationStyle(row: SpanRow): Record<string, string> {
    const width = Math.max(row.widthFraction * 100, 0.5)
    return {
      position: 'absolute',
      top: '0px',
      left: `calc(${row.startFraction * 100}% + ${width}% + 6px)`,
      height: `${ROW_HEIGHT_PX}px`,
      display: 'flex',
      'align-items': 'center',
      'font-size': '11px',
      opacity: '0.75',
      'white-space': 'nowrap',
      'pointer-events': 'none',
    }
  }
}
