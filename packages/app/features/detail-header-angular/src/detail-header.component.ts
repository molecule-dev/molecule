/**
 * DetailHeader component (React parity).
 *
 * @module
 */

import type { AfterViewInit, ElementRef } from '@angular/core'
import { Component, signal, ViewChild } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

/** React's sticky inline style, written to the DOM the way React writes it. */
const STICKY_STYLE = { position: 'sticky', top: 0, zIndex: 10 } as const

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
 * DetailHeader component.
 *
 * Header row for a detail page — leading slot + title/subtitle + status +
 * actions, with optional meta row and search slot. The host IS the root
 * `<header>` (`header[mol-detail-header]`), matching React's root exactly.
 * The title, subtitle, leading, status, actions, meta and search content is
 * projected (`[slot=<name>]`); a string `title` or `subtitle` input renders
 * as text. Same props, same DOM as
 * `@molecule/app-detail-header-react`'s `DetailHeader`.
 *
 * Angular projection needs the `<ng-content>` capture points mounted, so the
 * optional subtitle `<p>` and meta row render optimistically and
 * {@link DetailHeader.ngAfterViewInit} withdraws the ones nothing was
 * projected into (React would not render them at all).
 */
@Component({
  selector: 'header[mol-detail-header]',
  standalone: true,
  imports: [],
  inputs: ['title', 'subtitle', 'sticky', 'className', 'dataMolId'],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
    '[style]': 'stickyStyleText()',
  },
  // prettier-ignore
  template: `<div [class]="cm().flex({ justify: 'between', align: 'center', gap: 'md', wrap: 'wrap' })"><div [class]="cm().flex({ align: 'center', gap: 'sm' })"><ng-content select="[slot=leading]" /><div [class]="cm().stack(1)"><div [class]="cm().flex({ align: 'center', gap: 'sm' })"><h1 [class]="cm().cn(cm().textSize('2xl'), cm().fontWeight('bold'))">@if (hasTitle) {<ng-container>{{ title }}</ng-container>}<ng-content select="[slot=title]" /></h1><ng-content select="[slot=status]" /></div>@if (showSubtitle) {<p #subtitleEl [class]="cm().textSize('sm')">@if (hasSubtitle) {<ng-container>{{ subtitle }}</ng-container>}<ng-content select="[slot=subtitle]" /></p>}</div></div><div [class]="cm().flex({ align: 'center', gap: 'sm' })"><ng-content select="[slot=search]" /><ng-content select="[slot=actions]" /></div></div>@if (showMeta) {<div #metaEl [class]="cm().flex({ align: 'center', gap: 'sm', wrap: 'wrap' })"><ng-content select="[slot=meta]" /></div>}`,
})
export class DetailHeader implements AfterViewInit {
  /** Primary heading — a string input, or `[slot=title]` projected content. */
  title?: unknown
  /** Optional subtitle shown below the title — a string input, or `[slot=subtitle]` content. */
  subtitle?: unknown
  /** Whether to render with a sticky-top style (position: sticky). */
  sticky?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** The optional subtitle paragraph (projected content lands here; read once). */
  @ViewChild('subtitleEl') private subtitleEl?: ElementRef<HTMLParagraphElement>
  /** The optional meta row (projected content lands here; read once). */
  @ViewChild('metaEl') private metaEl?: ElementRef<HTMLDivElement>

  /**
   * Whether a `[slot=subtitle]` projection landed: true (optimistically) until
   * the first view proves otherwise, false when nothing was projected, null
   * while a text subtitle decides the paragraph on its own.
   */
  private readonly subtitleProjected = signal<boolean | null>(true)
  /**
   * Whether a `[slot=meta]` projection landed (true until the first view
   * proves otherwise).
   */
  private readonly metaProjected = signal<boolean | null>(true)

  /**
   * Reads the optional regions' first render: when neither a text input nor
   * projected content landed, React would not render the region at all, so
   * the optimistic render is withdrawn. View queries resolve only at view
   * init, and a projected slot's content is in place by then.
   */
  ngAfterViewInit(): void {
    const p = this.subtitleEl?.nativeElement
    if (p) {
      // A text subtitle decides the paragraph on its own (undecided: a later
      // input change must be able to withdraw it); otherwise the projection
      // read decides.
      this.subtitleProjected.set(this.hasSubtitle ? null : hasRenderableContent(p))
    }
    const meta = this.metaEl?.nativeElement
    if (meta) {
      this.metaProjected.set(hasRenderableContent(meta))
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
   * Computes the header class list (React's `cm.cn(cm.stack(2), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(2), this.className)
  }

  /**
   * The header's inline style text (React's
   * `style={sticky ? { position: 'sticky', top: 0, zIndex: 10 } : undefined}`);
   * null when not sticky, so no `style` attribute renders.
   * @returns The style text or null.
   */
  stickyStyleText(): string | null {
    return this.sticky ? styleText(STICKY_STYLE) : null
  }

  /**
   * Whether a text title input renders (a projected title is not).
   * @returns True when the title input renders as text.
   */
  get hasTitle(): boolean {
    return this.title !== undefined && this.title !== null
  }

  /**
   * Whether a text subtitle input is present.
   * @returns True when the subtitle input renders as text.
   */
  get hasSubtitle(): boolean {
    return this.subtitle !== undefined && this.subtitle !== null && this.subtitle !== ''
  }

  /**
   * Whether the subtitle paragraph renders: React's `subtitle && …` — a truthy
   * string input or a projected `[slot=subtitle]` element. A plain getter, so
   * every change detection pass follows the inputs.
   * @returns True when the subtitle shows.
   */
  get showSubtitle(): boolean {
    return this.hasSubtitle || this.subtitleProjected() === true
  }

  /**
   * Whether the meta row renders: React's `meta && …` — a projected
   * `[slot=meta]` element. A plain getter, so every change detection pass
   * follows the inputs.
   * @returns True when the meta row shows.
   */
  get showMeta(): boolean {
    return this.metaProjected() === true
  }
}
