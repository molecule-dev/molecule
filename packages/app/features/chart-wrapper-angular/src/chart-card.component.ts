/**
 * ChartCard component (React parity).
 *
 * @module
 */

import type { AfterViewInit, ElementRef } from '@angular/core'
import { Component, signal, ViewChild } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

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
const hasRenderableContent = (el: HTMLElement): boolean =>
  Array.from(el.childNodes).some(hasRenderable)

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
 * Angular projection needs the `<ng-content>` capture points mounted, so the
 * optional description / actions / summary / footer regions render
 * optimistically and {@link ChartCard.ngAfterViewInit} withdraws the ones
 * nothing was projected into (React would not render them at all).
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
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  // prettier-ignore
  template: `<div [class]="stackClasses()"><header [class]="headerClasses()"><div [class]="titleBlockClasses()"><h3 [class]="titleClasses()">@if (hasTitle) {{{ title }}}<ng-content select="[slot=title]" /></h3>@if (showDescription) {<p #descriptionEl [class]="descriptionClasses()">@if (hasDescription) {{{ description }}}<ng-content select="[slot=description]" /></p>}</div>@if (showActions) {<div #actionsEl [class]="actionsClasses()">@if (hasActions) {{{ actions }}}<ng-content select="[slot=actions]" /></div>}</header>@if (showSummary) {<div #summaryEl [class]="summaryClasses()">@if (hasSummary) {{{ summary }}}<ng-content select="[slot=summary]" /></div>}<div [style]="chartHeightStyle()"><ng-content></ng-content></div>@if (showFooter) {<div #footerEl>@if (hasFooter) {{{ footer }}}<ng-content select="[slot=footer]" /></div>}</div>`,
})
export class ChartCard implements AfterViewInit {
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

  /** The optional description paragraph (projected content lands here; read once). */
  @ViewChild('descriptionEl') private descriptionEl?: ElementRef<HTMLParagraphElement>
  /** The optional actions row (projected content lands here; read once). */
  @ViewChild('actionsEl') private actionsEl?: ElementRef<HTMLDivElement>
  /** The optional summary strip (projected content lands here; read once). */
  @ViewChild('summaryEl') private summaryEl?: ElementRef<HTMLDivElement>
  /** The optional footer (projected content lands here; read once). */
  @ViewChild('footerEl') private footerEl?: ElementRef<HTMLDivElement>

  /** Whether a `[slot=description]` projection landed (true until the first view proves otherwise). */
  private readonly descriptionProjected = signal(true)
  /** Whether a `[slot=actions]` projection landed (true until the first view proves otherwise). */
  private readonly actionsProjected = signal(true)
  /** Whether a `[slot=summary]` projection landed (true until the first view proves otherwise). */
  private readonly summaryProjected = signal(true)
  /** Whether a `[slot=footer]` projection landed (true until the first view proves otherwise). */
  private readonly footerProjected = signal(true)

  /**
   * Reads the optional regions' first render: when neither a text input nor
   * projected content landed, React would not render the region at all, so the
   * optimistic render is withdrawn.
   */
  ngAfterViewInit(): void {
    const description = this.descriptionEl?.nativeElement
    if (description) this.descriptionProjected.set(hasRenderableContent(description))
    const actions = this.actionsEl?.nativeElement
    if (actions) this.actionsProjected.set(hasRenderableContent(actions))
    const summary = this.summaryEl?.nativeElement
    if (summary) this.summaryProjected.set(hasRenderableContent(summary))
    const footer = this.footerEl?.nativeElement
    if (footer) this.footerProjected.set(hasRenderableContent(footer))
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
   * Whether the description paragraph renders.
   * @returns True when the description shows.
   */
  get showDescription(): boolean {
    return this.hasDescription || this.descriptionProjected()
  }

  /**
   * Whether the actions row renders.
   * @returns True when the actions show.
   */
  get showActions(): boolean {
    return this.hasActions || this.actionsProjected()
  }

  /**
   * Whether the summary strip renders.
   * @returns True when the summary shows.
   */
  get showSummary(): boolean {
    return this.hasSummary || this.summaryProjected()
  }

  /**
   * Whether the footer renders.
   * @returns True when the footer shows.
   */
  get showFooter(): boolean {
    return this.hasFooter || this.footerProjected()
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
