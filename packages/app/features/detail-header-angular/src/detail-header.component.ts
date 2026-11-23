/**
 * DetailHeader component (React parity).
 *
 * @module
 */

import type { ElementRef } from '@angular/core'
import { Component, ViewChild } from '@angular/core'

import { MolPlacement, setElementPresent, usePlacement } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

/** React's sticky inline style, written to the DOM the way React writes it. */
const STICKY_STYLE = { position: 'sticky', top: 0, zIndex: 10 } as const

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
 * The optional subtitle `<p>` and meta row stay in the template so their
 * `<ng-content>` capture points always mount, and leave the page while nothing
 * renders in them, as React's `{subtitle && …}` and `{meta && …}` render no
 * such element.
 */
@Component({
  selector: 'header[mol-detail-header]',
  standalone: true,
  imports: [],
  inputs: ['title', 'subtitle', 'sticky', 'className', 'dataMolId'],
  hostDirectives: [MolPlacement],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
    '[style]': 'stickyStyleText()',
  },
  // prettier-ignore
  template: `<div [class]="cm().flex({ justify: 'between', align: 'center', gap: 'md', wrap: 'wrap' })"><div [class]="cm().flex({ align: 'center', gap: 'sm' })"><ng-content select="[slot=leading]" /><div [class]="cm().stack(1)"><div [class]="cm().flex({ align: 'center', gap: 'sm' })"><h1 [class]="cm().cn(cm().textSize('2xl'), cm().fontWeight('bold'))">@if (hasTitle) {<ng-container>{{ title }}</ng-container>}<ng-content select="[slot=title]" /></h1><ng-content select="[slot=status]" /></div><p #subtitleEl [class]="cm().textSize('sm')">@if (hasSubtitle) {<ng-container>{{ subtitle }}</ng-container>}<ng-content select="[slot=subtitle]" /></p></div></div><div [class]="cm().flex({ align: 'center', gap: 'sm' })"><ng-content select="[slot=search]" /><ng-content select="[slot=actions]" /></div></div><div #metaEl [class]="cm().flex({ align: 'center', gap: 'sm', wrap: 'wrap' })"><ng-content select="[slot=meta]" /></div>`,
})
export class DetailHeader {
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

  /** The subtitle paragraph (always in the heading column; detached while it has nothing to render). */
  @ViewChild('subtitleEl', { static: true }) private subtitleEl?: ElementRef<HTMLParagraphElement>
  /** The meta row (always a root sibling; detached while it has nothing to render). */
  @ViewChild('metaEl', { static: true }) private metaEl?: ElementRef<HTMLDivElement>

  /**
   * Keeps the optional subtitle and meta row on the page only while they
   * render a text input or projected content, re-decided whenever either
   * changes (a slot taken away and given back included).
   */
  constructor() {
    usePlacement((hasContent) => {
      const subtitle = this.subtitleEl?.nativeElement
      setElementPresent(subtitle, this.hasSubtitle || (subtitle ? hasContent(subtitle) : false))
      const meta = this.metaEl?.nativeElement
      setElementPresent(meta, meta ? hasContent(meta) : false)
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
}
