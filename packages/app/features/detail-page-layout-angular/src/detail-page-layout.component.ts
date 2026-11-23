/**
 * DetailPageLayout component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContent,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

const SIDEBAR_WIDTH = { sm: 64, md: 80, lg: 96 } as const

/**
 * DetailPageLayout component.
 *
 * Two- or three-row detail-page scaffold: breadcrumb (optional), top bar
 * (optional sticky), two-column body with a main region and an optional
 * sidebar on either side. The host IS the outer `<div>`
 * (`div[mol-detail-page-layout]`), matching React's root exactly. The layout
 * uses ClassMap tokens (`cm.stack(4)`, `cm.flex`, `cm.flex1`) so the bonded
 * styling layer controls the visual treatment.
 *
 * The four regions are projected content (`[slot=breadcrumb]`,
 * `[slot=topBar]`, `[slot=main]`, `[slot=sidebar]`). React renders the
 * sidebar inside an `<aside>` that exists only when a sidebar is supplied and
 * sits before or after the main column per `sidebarPosition`. The template
 * holds one `<aside>` at each position — the projection slot must exist for
 * `[slot=sidebar]` content — and the projection is placed into whichever one
 * React would render, with neither left in the DOM when no sidebar content was
 * projected.
 */
@Component({
  selector: 'div[mol-detail-page-layout]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: [
    'breadcrumb',
    'topBar',
    'sidebar',
    'sidebarPosition',
    'sidebarWidth',
    'className',
    'dataMolId',
  ],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  template: `<ng-content select="[slot=breadcrumb]"></ng-content
    ><ng-content select="[slot=topBar]"></ng-content>
    <div #bodyEl [class]="bodyClasses()">
      <aside #leftAside [style.flex-basis]="sidebarBasis()" [style.flex-shrink]="'0'">
        <ng-content select="[slot=sidebar]"></ng-content>
      </aside>
      <main #mainEl [class]="mainClasses()">
        <div [class]="stackClasses()"><ng-content select="[slot=main]"></ng-content></div>
      </main>
      <aside #rightAside [style.flex-basis]="sidebarBasis()" [style.flex-shrink]="'0'"></aside>
    </div>`,
})
export class DetailPageLayout {
  /** Breadcrumb rendered above everything (projected `[slot=breadcrumb]` content). */
  breadcrumb?: unknown
  /** Sticky top bar (projected `[slot=topBar]` content). */
  topBar?: unknown
  /** Optional sidebar column (projected `[slot=sidebar]` content). */
  sidebar?: unknown
  /** Sidebar position — `'right'` default or `'left'`. */
  sidebarPosition?: 'left' | 'right'
  /** Sidebar width preset. Defaults to `'md'`. */
  sidebarWidth?: 'sm' | 'md' | 'lg'
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** The sidebar aside at React's left position (the projection capture point). */
  @ViewChild('leftAside') leftAside?: ElementRef<HTMLElement>
  /** The sidebar aside at React's right position. */
  @ViewChild('rightAside') rightAside?: ElementRef<HTMLElement>

  constructor() {
    usePlacement((hasContent) => this.placeSidebar(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the wrapper class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(4), this.className)
  }

  /**
   * The body row's class (`cm.flex({ align, gap, direction })`).
   * @returns The class string.
   */
  bodyClasses(): string {
    return this.cm().cn(
      this.cm().flex({
        align: 'start',
        gap: 'lg',
        direction: this.position() === 'left' ? 'row' : 'row',
      }),
    )
  }

  /**
   * The main column's class (`cm.flex1`), through `cn()` so a token that is a
   * function in the bonded map resolves to its string.
   * @returns The class string.
   */
  mainClasses(): string {
    return this.cm().cn(this.cm().flex1)
  }

  /**
   * The main column's inner stack class (`cm.stack(4)`).
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().stack(4)
  }

  /**
   * The sidebar position (React's default parameter).
   * @returns `'left'` or `'right'`.
   */
  position(): 'left' | 'right' {
    return this.sidebarPosition ?? 'right'
  }

  /**
   * The sidebar's fixed flex-basis width from the preset (React's default
   * parameter: an `undefined` binding must not erase the `'md'` default).
   * @returns The CSS width.
   */
  sidebarBasis(): string {
    return `${SIDEBAR_WIDTH[this.sidebarWidth ?? 'md'] * 4}px`
  }

  /**
   * Renders the sidebar aside where React would render it: the left aside
   * holds the projected content when the sidebar sits before the main column,
   * the right aside when it sits after it, and neither renders when no sidebar
   * content was projected.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private placeSidebar(hasContent: SlotReader): void {
    const left = this.leftAside?.nativeElement
    const right = this.rightAside?.nativeElement
    if (!left || !right) return
    const present = hasContent(left)
    const onRight = present && this.position() === 'right'
    if (onRight) placeContent(left, right)
    else placeContent(left, null)
    setElementPresent(left, present && !onRight)
    setElementPresent(right, onRight)
  }
}
