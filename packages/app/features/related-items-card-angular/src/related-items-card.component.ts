/**
 * RelatedItemsCard component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type ElementRef, type TemplateRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContent,
  placeContentBefore,
  setElementPresent,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

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
 * text instead. `onItemClick` makes the rows clickable: the `<li>` stays a
 * list item and the card wraps the row content in an inner `role="button"`
 * div — focusable, with Enter/Space running the same handler the click does.
 */
@Component({
  selector: 'div[mol-related-items-card]',
  standalone: true,
  hostDirectives: [MolPlacement],
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
          <li>
            @if (onItemClick) {
              <!-- The row's clickable surface: the li stays a list item and
                this role="button" control carries the click and the
                Enter/Space activation, the way React's inner div does. -->
              <div
                role="button"
                tabindex="0"
                [class]="rowClasses()"
                (click)="clickRow(item, $index)"
                (keydown)="keydownRow(item, $index, $event)"
              >
                <ng-container
                  [ngTemplateOutlet]="renderItem ?? null"
                  [ngTemplateOutletContext]="rowContext(item, $index)"
                ></ng-container>
              </div>
            } @else {
              <ng-container
                [ngTemplateOutlet]="renderItem ?? null"
                [ngTemplateOutletContext]="rowContext(item, $index)"
              ></ng-container>
            }
          </li>
        }
      </ul>
    }
    <span #emptySlot
      ><ng-content select="[slot=emptyState]"></ng-content>{{ emptyStateText() }}</span
    >
  </div>`,
})
export class RelatedItemsCard<T = unknown> {
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

  constructor() {
    usePlacement(() => this.reconcile())
  }

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
   * The row controls' class: React puts `cm.cursorPointer` on the inner
   * button-role div only when a row is clickable.
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

  /**
   * Keyboard activation for a clickable row — the same call the mouse click
   * makes. The row control is a `role="button"` div (an `<li>` may not carry
   * button semantics), so it activates Enter and Space itself;
   * `preventDefault` keeps the browser's own key-driven click from firing the
   * handler a second time.
   * @param item - The row's item.
   * @param index - The row's index.
   * @param event - The keydown event on the row control.
   */
  keydownRow(item: T, index: number, event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    this.onItemClick?.(item, index)
  }

  /**
   * Renders the empty state bare exactly while the list is empty: the content
   * stands at the capture point's own place (following it wherever Angular puts
   * it) with the point itself out of the DOM, or hidden inside it when the list
   * renders.
   */
  private reconcile(): void {
    const slot = this.emptySlot?.nativeElement
    if (!slot) return
    if (this.items.length > 0) {
      placeContent(slot, null)
      setElementPresent(slot, false)
      return
    }
    // React renders `{emptyState}` bare in the slot's place, with no wrapper.
    placeContentBefore(slot, slot)
    setElementPresent(slot, false)
  }
}
