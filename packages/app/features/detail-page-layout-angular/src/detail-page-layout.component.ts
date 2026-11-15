/**
 * DetailPageLayout component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type ElementRef,
  type OnChanges,
  type SimpleChanges,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

const SIDEBAR_WIDTH = { sm: 64, md: 80, lg: 96 } as const

/**
 * Whether an element captured any element or text node.
 *
 * @param el - The element.
 * @returns True when at least one projected node exists.
 */
const hasNodes = (el: Element): boolean => {
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 1) return true
    if (node.nodeType === 3 && (node.textContent ?? '').trim()) return true
  }
  return false
}

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
 * sits before or after the main column per `sidebarPosition`, so the
 * component keeps one sidebar `<aside>` in its template — the projection slot
 * must exist for `[slot=sidebar]` content — and places it: it moves the
 * aside around the `<main>` column and removes it entirely when no sidebar
 * content was projected.
 */
@Component({
  selector: 'div[mol-detail-page-layout]',
  standalone: true,
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
      <aside #sidebarEl [style.flex-basis]="sidebarBasis()" [style.flex-shrink]="'0'">
        <ng-content select="[slot=sidebar]"></ng-content>
      </aside>
      <main #mainEl [class]="mainClasses()">
        <div [class]="stackClasses()"><ng-content select="[slot=main]"></ng-content></div>
      </main>
    </div>`,
})
export class DetailPageLayout implements AfterViewInit, OnChanges {
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

  /** The body row (main + optional aside). */
  @ViewChild('bodyEl') bodyEl?: ElementRef<HTMLDivElement>
  /** The sidebar aside (React renders none when no sidebar is supplied). */
  @ViewChild('sidebarEl') sidebarEl?: ElementRef<HTMLElement>
  /** The main column. */
  @ViewChild('mainEl') mainEl?: ElementRef<HTMLElement>

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
   * Places the sidebar aside where React would render it: before the main
   * column for `left`, after it for `right`, and out of the DOM entirely when
   * no sidebar content was projected.
   */
  ngAfterViewInit(): void {
    this.placeSidebar()
  }

  /**
   * Re-places the sidebar when an input changes (a `sidebarPosition` change
   * moves it around the main column).
   * @param _changes - The changed inputs.
   */
  ngOnChanges(_changes: SimpleChanges): void {
    this.placeSidebar()
  }

  /**
   * Moves (or detaches) the sidebar aside to match the current inputs; a
   * no-op before the view exists (the first placement happens at view init).
   */
  private placeSidebar(): void {
    const aside = this.sidebarEl?.nativeElement
    const body = this.bodyEl?.nativeElement
    const main = this.mainEl?.nativeElement
    if (!aside || !body || !main) return
    if (!hasNodes(aside)) {
      aside.remove()
      return
    }
    if (this.position() === 'left') body.insertBefore(aside, main)
    else body.appendChild(aside)
  }
}
