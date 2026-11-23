/**
 * ActivityFeed component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, ElementRef, inject, TemplateRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContent,
  placeContentBefore,
  placeElementBefore,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { ActivityFeedItem } from './activity-feed-item.component.js'
import type { ActivityFeedItemData } from './types.js'

/**
 * ActivityFeed component.
 *
 * Simple activity feed — renders each item via `<ActivityFeedItem>` and stacks
 * them. React's root is the `<div>` when it has something to render and the
 * bare `emptyState` when the list is empty, so nothing of Angular's host stays
 * in the page: the `<div>` renders immediately before the host's place, and the
 * empty-state capture renders its content bare in that place, while the host
 * itself leaves the DOM. The empty state and the footer are projected content
 * (`[slot=emptyState]` / `[slot=footer]`) or template inputs, reconciled
 * against React's branch by the placement function registered in the
 * constructor.
 *
 * For date-grouped feeds use {@link ActivityFeedGroup}.
 */
@Component({
  selector: 'mol-activity-feed',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [NgTemplateOutlet, ActivityFeedItem],
  inputs: ['items', 'emptyState', 'footer', 'className'],
  // prettier-ignore
  template: `<span #empty>@if (emptyTemplate(); as emptyTpl) {<ng-container [ngTemplateOutlet]="emptyTpl"></ng-container>}<ng-content select="[slot=emptyState]"></ng-content></span><div #list [class]="listClasses()">@for (item of items; track item.id) {<article mol-activity-feed-item [item]="item"></article>}@if (footerTemplate(); as footerTpl) {<ng-container [ngTemplateOutlet]="footerTpl"></ng-container>}<ng-content select="[slot=footer]"></ng-content></div>`,
})
export class ActivityFeed {
  /** Items in display order (usually most-recent first). */
  items: ActivityFeedItemData[] = []

  /** Empty-state content, as an input (a template reference from a props change). */
  emptyState?: unknown

  /** Footer content, as an input (a template reference from a props change). */
  footer?: unknown

  /** Extra classes on the outer wrapper. */
  className?: string

  /** The projected empty-state capture point (its content renders bare in the host's place). */
  @ViewChild('empty') private empty?: ElementRef<HTMLElement>

  /** The feed wrapper (rendered beside the host when the list branch shows). */
  @ViewChild('list') private list?: ElementRef<HTMLElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the wrapper class list (`cm.stack(4)` + `className`).
   * @returns The class string.
   */
  listClasses(): string {
    return this.cm().cn(this.cm().stack(4), this.className)
  }

  /**
   * The empty state as an input template (a node passed as a prop rather than
   * projected as `[slot=emptyState]`), when there is one.
   * @returns The empty-state template, or null.
   */
  emptyTemplate(): TemplateRef<unknown> | null {
    return this.emptyState instanceof TemplateRef ? this.emptyState : null
  }

  /**
   * The footer as an input template (a node passed as a prop rather than
   * projected as `[slot=footer]`), when there is one.
   * @returns The footer template, or null.
   */
  footerTemplate(): TemplateRef<unknown> | null {
    return this.footer instanceof TemplateRef ? this.footer : null
  }

  /**
   * Applies React's condition: with no items and an empty state, the empty state
   * renders bare and the feed wrapper disappears; otherwise the wrapper renders
   * and the empty state is dropped. The empty-state capture itself never
   * reaches the page — its content renders in the host's place — and the host
   * leaves the DOM, so the consumer sees exactly React's nodes.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const empty = this.empty?.nativeElement
    const list = this.list?.nativeElement
    const host = this.host.nativeElement
    const hasEmpty = (this.items?.length ?? 0) === 0 && hasContent(empty)
    if (hasEmpty) {
      // The projected empty state renders bare where the host stands.
      placeContentBefore(empty, host)
      setElementPresent(list, false)
    } else {
      // Nothing is projected: the wrapper is React's root, beside the host's place.
      placeContent(empty, null)
      placeElementBefore(list, host)
    }
    setElementPresent(empty, false)
    setElementPresent(host, false)
  }
}
