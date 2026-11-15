/**
 * RelatedItemsCard component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  Renderer2,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { BareSlot } from './slot-dom.js'

/**
 * RelatedItemsCard component.
 *
 * Card container for a list of cross-linked / related items. Common usage:
 * "Company → Deals", "Contact → Notes", "Ticket → Related Articles",
 * "Post → Related Posts". Apps supply the item data and a renderer; the card
 * provides consistent header + list + empty-state + view-all chrome. The host
 * IS the Card's `<div>` (`div[mol-related-items-card]`), matching React's root
 * exactly; the Card classes (`cm.card({ variant: 'elevated' })` +
 * `cm.cardPadding('md')`, the UI Card's defaults) are applied through the host
 * class binding.
 *
 * Node props are projected content: `icon` and `title` render inside the
 * header (icon first, then the `<h3>`), `headerActions` inside the right-hand
 * header row before the "View all" link, and `emptyState` in the list's place
 * when `items` is empty — bare, as React renders it. String inputs render as
 * text instead. `onItemClick` makes the rows clickable (React's mouse-only
 * `<li>` rows: no button semantics, no keyboard handler).
 */
@Component({
  selector: 'div[mol-related-items-card]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: [
    'title',
    'items',
    'renderItem',
    'onItemClick',
    'emptyState',
    'viewAllHref',
    'className',
    'dataMolId',
  ],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  template: `<div [class]="stackClasses()">
    <header [class]="headerClasses()">
      <div [class]="headerSectionClasses()">
        <ng-content select="[slot=icon]"></ng-content>
        <h3 [class]="titleClasses()">
          {{ titleText() }}<ng-content select="[slot=title]"></ng-content>
        </h3>
      </div>
      <div [class]="headerSectionClasses()">
        <ng-content select="[slot=headerActions]"></ng-content>
        @if (viewAllHref) {
          <a [attr.href]="viewAllHref" [class]="linkClasses()">View all</a>
        }
      </div>
    </header>
    @if (items.length > 0) {
      <ul [class]="listClasses()">
        @for (item of items; track $index) {
          <li [class]="rowClasses()" (click)="clickRow(item, $index)">
            <ng-container
              [ngTemplateOutlet]="renderItem ?? null"
              [ngTemplateOutletContext]="rowContext(item, $index)"
            ></ng-container>
          </li>
        }
      </ul>
    }
    <span #emptySlot
      ><ng-content select="[slot=emptyState]"></ng-content>{{ emptyStateText() }}</span
    >
  </div>`,
})
export class RelatedItemsCard<T = unknown> implements AfterViewInit, DoCheck {
  /** Card heading (string/number renders as text; nodes are `[slot=title]` content). */
  title?: unknown
  /** Items to render. */
  items: readonly T[] = []
  /**
   * Render function for each item, as a `TemplateRef` whose context carries
   * the item as `$implicit`/`a0` and its index as `a1`.
   */
  renderItem?: TemplateRef<unknown>
  /** Called when an item row is clicked (if applicable). */
  onItemClick?: (item: T, index: number) => void
  /** Rendered when `items` is empty (string/number as text; nodes are `[slot=emptyState]` content). */
  emptyState?: unknown
  /** Optional "View all" link rendered in the header. */
  viewAllHref?: string
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** The empty state's capture wrapper (revealed bare, or detached). */
  @ViewChild('emptySlot') emptySlot?: ElementRef<HTMLElement>

  /** The wrapper sync for the empty state. */
  private readonly bare = new BareSlot(inject(ElementRef), inject(Renderer2))

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the Card's class list (`cm.card({ variant: 'elevated' })` +
   * `cm.cardPadding('md')` — the UI Card's defaults — plus `className`).
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
   * The content column's class (`cm.stack(3)`).
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().stack(3)
  }

  /**
   * The header row's class (`cm.flex({ justify: 'between', align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().flex({ justify: 'between', align: 'center', gap: 'sm' })
  }

  /**
   * Both header sections' class (`cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  headerSectionClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The title's class (`cm.textSize('base')` + `cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('base'), this.cm().fontWeight('semibold'))
  }

  /**
   * The "View all" link's class (`cm.textSize('sm')` + `cm.link`).
   * @returns The class string.
   */
  linkClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().link)
  }

  /**
   * The list's class (`cm.stack(2)`).
   * @returns The class string.
   */
  listClasses(): string {
    return this.cm().stack(2)
  }

  /**
   * The rows' class: React adds `cm.cursorPointer` only when a row is clickable.
   * @returns The class string, or null for no class attribute.
   */
  rowClasses(): string | null {
    return this.onItemClick ? this.cm().cn(this.cm().cursorPointer) : null
  }

  /**
   * The title input's text (React's `{title}` for a text child).
   * @returns The text, or `''` for a node title.
   */
  titleText(): string {
    return typeof this.title === 'string' || typeof this.title === 'number'
      ? String(this.title)
      : ''
  }

  /**
   * The empty state input's text (React's `{emptyState}` for a text child).
   * @returns The text, or `''` for a node empty state.
   */
  emptyStateText(): string {
    return typeof this.emptyState === 'string' || typeof this.emptyState === 'number'
      ? String(this.emptyState)
      : ''
  }

  /**
   * The template context for one row: the item as `$implicit`/`a0`, its index
   * as `a1` (React calls `renderItem(item, index)`).
   * @param item - The row's item.
   * @param index - The row's index.
   * @returns The template context.
   */
  rowContext(item: T, index: number): Record<string, unknown> {
    return { $implicit: item, a0: item, a1: index, a2: undefined }
  }

  /**
   * Runs the row's click handler the way React calls `onItemClick(item, index)`.
   * @param item - The row's item.
   * @param index - The row's index.
   */
  clickRow(item: T, index: number): void {
    this.onItemClick?.(item, index)
  }

  /** Captures the empty state's wrapper once the view has resolved. */
  ngAfterViewInit(): void {
    this.syncEmptySlot()
  }

  /** Re-syncs the empty state when `items` changes. */
  ngDoCheck(): void {
    this.syncEmptySlot()
  }

  /** Renders the empty state bare exactly while the list is empty. */
  private syncEmptySlot(): void {
    const slot = this.emptySlot?.nativeElement
    if (!slot) return
    this.bare.sync(slot, this.items.length === 0)
  }
}
