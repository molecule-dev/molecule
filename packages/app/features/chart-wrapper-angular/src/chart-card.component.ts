/**
 * ChartCard component (React parity).
 *
 * @module
 */

import type { ElementRef } from '@angular/core'
import { Component, ViewChild } from '@angular/core'

import { MolPlacement, setElementPresent, usePlacement } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

/**
 * ChartCard component.
 *
 * Uniform chrome around a chart rendering — header + actions + optional
 * summary strip + chart body + optional footer. The host IS the Card `div`
 * (`div[mol-chart-card]`), matching React's root exactly: React renders
 * `<Card className data-mol-id>` whose Card defaults are variant `elevated`
 * and padding `md`, so the host wears that same class list. The regions'
 * content is projected content (`[slot=title]`, `[slot=description]`,
 * `[slot=actions]`, `[slot=summary]`, `[slot=footer]`, and the default slot).
 *
 * This is the Angular counterpart of `@molecule/app-chart-wrapper-react`.
 *
 * @remarks
 * The optional description / actions / summary / footer regions stay in the
 * template so their `<ng-content>` capture points always mount, and leave the
 * page while nothing renders in them, as React's `{description && …}`,
 * `{actions && …}`, `{summary && …}` and `{footer && …}` render no such
 * element.
 */
@Component({
  selector: 'div[mol-chart-card]',
  standalone: true,
  inputs: [
    'title',
    'description',
    'actions',
    'summary',
    'footer',
    'minChartHeight',
    'className',
    'dataMolId',
  ],
  hostDirectives: [MolPlacement],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  // prettier-ignore
  template: `<div [class]="stackClasses()"><header [class]="headerClasses()"><div [class]="titleBlockClasses()"><h3 [class]="titleClasses()">@if (hasTitle) {{{ title }}}<ng-content select="[slot=title]" /></h3><p #descriptionEl [class]="descriptionClasses()">@if (hasDescription) {{{ description }}}<ng-content select="[slot=description]" /></p></div><div #actionsEl [class]="actionsClasses()">@if (hasActions) {{{ actions }}}<ng-content select="[slot=actions]" /></div></header><div #summaryEl [class]="summaryClasses()">@if (hasSummary) {{{ summary }}}<ng-content select="[slot=summary]" /></div><div [style]="chartHeightStyle()"><ng-content></ng-content></div><div #footerEl>@if (hasFooter) {{{ footer }}}<ng-content select="[slot=footer]" /></div></div>`,
})
export class ChartCard {
  /** Card heading — a string input, or `[slot=title]` projected content. */
  title?: unknown
  /** Optional supporting description — a string input, or `[slot=description]` content. */
  description?: unknown
  /** Optional right-aligned actions — a string input, or `[slot=actions]` content. */
  actions?: unknown
  /** Optional KPI summary row — a string input, or `[slot=summary]` content. */
  summary?: unknown
  /** Optional footer — a string input, or `[slot=footer]` content. */
  footer?: unknown
  /** Minimum chart height. Defaults to `240` (React's default parameter). */
  minChartHeight?: number
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** The description paragraph (always in the title block; detached while it has nothing to render). */
  @ViewChild('descriptionEl', { static: true })
  private descriptionEl?: ElementRef<HTMLParagraphElement>
  /** The actions row (always in the header; detached while it has nothing to render). */
  @ViewChild('actionsEl', { static: true }) private actionsEl?: ElementRef<HTMLDivElement>
  /** The summary strip (always in the stack; detached while it has nothing to render). */
  @ViewChild('summaryEl', { static: true }) private summaryEl?: ElementRef<HTMLDivElement>
  /** The footer (always in the stack; detached while it has nothing to render). */
  @ViewChild('footerEl', { static: true }) private footerEl?: ElementRef<HTMLDivElement>

  /**
   * Keeps each optional region on the page only while it renders a text input
   * or projected content, re-decided whenever either changes (a slot taken
   * away and given back included).
   */
  constructor() {
    usePlacement((hasContent) => {
      const description = this.descriptionEl?.nativeElement
      setElementPresent(
        description,
        this.hasDescription || (description ? hasContent(description) : false),
      )
      const actions = this.actionsEl?.nativeElement
      setElementPresent(actions, this.hasActions || (actions ? hasContent(actions) : false))
      const summary = this.summaryEl?.nativeElement
      setElementPresent(summary, this.hasSummary || (summary ? hasContent(summary) : false))
      const footer = this.footerEl?.nativeElement
      setElementPresent(footer, this.hasFooter || (footer ? hasContent(footer) : false))
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
   * Whether a text title input renders (a projected title is not).
   * @returns True when the title input renders as text.
   */
  get hasTitle(): boolean {
    return this.title !== undefined && this.title !== null
  }

  /**
   * Whether a text description input renders (React's `description && …`).
   * @returns True when the description renders as text.
   */
  get hasDescription(): boolean {
    return (
      this.description !== undefined &&
      this.description !== null &&
      this.description !== false &&
      this.description !== ''
    )
  }

  /**
   * Whether a text actions input renders (React's `actions && …`).
   * @returns True when the actions render as text.
   */
  get hasActions(): boolean {
    return (
      this.actions !== undefined &&
      this.actions !== null &&
      this.actions !== false &&
      this.actions !== ''
    )
  }

  /**
   * Whether a text summary input renders (React's `summary && …`).
   * @returns True when the summary renders as text.
   */
  get hasSummary(): boolean {
    return (
      this.summary !== undefined &&
      this.summary !== null &&
      this.summary !== false &&
      this.summary !== ''
    )
  }

  /**
   * Whether a text footer input renders (React's `footer && …`).
   * @returns True when the footer renders as text.
   */
  get hasFooter(): boolean {
    return (
      this.footer !== undefined &&
      this.footer !== null &&
      this.footer !== false &&
      this.footer !== ''
    )
  }

  /**
   * The host's class list: the Card surface React renders (variant `elevated`,
   * padding `md`, not interactive) plus `className`.
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
   * The body class (`cm.stack(4)`).
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().stack(4)
  }

  /**
   * The header class (`cm.flex({ justify: 'between', align: 'start', gap: 'sm' })`).
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().flex({ justify: 'between', align: 'start', gap: 'sm' })
  }

  /**
   * The title block class (`cm.stack(1)`).
   * @returns The class string.
   */
  titleBlockClasses(): string {
    return this.cm().stack(1)
  }

  /**
   * The title heading class (`cm.textSize('base')` + `cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('base'), this.cm().fontWeight('semibold'))
  }

  /**
   * The description class (`cm.textSize('sm')`).
   * @returns The class string.
   */
  descriptionClasses(): string {
    return this.cm().textSize('sm')
  }

  /**
   * The actions row class (`cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  actionsClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The summary strip class (`cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })`).
   * @returns The class string.
   */
  summaryClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'md', wrap: 'wrap' })
  }

  /**
   * The chart body's inline style (React's `{ minHeight: minChartHeight }`,
   * default 240).
   * @returns The style attribute text.
   */
  chartHeightStyle(): string {
    return styleText({ minHeight: this.minChartHeight ?? 240 }) ?? ''
  }
}
