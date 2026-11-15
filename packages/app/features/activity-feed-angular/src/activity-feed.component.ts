/**
 * ActivityFeed component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewChecked,
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  Renderer2,
  TemplateRef,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { ActivityFeedItem } from './activity-feed-item.component.js'
import { hasNodes, SlotGuard } from './slot-dom.js'
import type { ActivityFeedItemData } from './types.js'

/**
 * ActivityFeed component.
 *
 * Simple activity feed — renders each item via `<ActivityFeedItem>` and stacks
 * them. React's root is the `<div>` when it has something to render and the
 * bare `emptyState` when the list is empty, so the host is unwrapped
 * (`data-parity-unwrap`, `display: contents`) and the `<div>` is rendered inside
 * it. The empty state and the footer are projected content
 * (`[slot=emptyState]` / `[slot=footer]`) or template inputs, reconciled by
 * {@link ActivityFeed.ngAfterViewInit} / {@link ActivityFeed.ngAfterViewChecked}
 * / {@link ActivityFeed.ngDoCheck} against React's branch.
 *
 * For date-grouped feeds use {@link ActivityFeedGroup}.
 */
@Component({
  selector: 'mol-activity-feed',
  standalone: true,
  imports: [NgTemplateOutlet, ActivityFeedItem],
  inputs: ['items', 'emptyState', 'footer', 'className'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  // prettier-ignore
  template: `<span #empty data-parity-unwrap style="display: contents">@if (emptyTemplate(); as emptyTpl) {<ng-container [ngTemplateOutlet]="emptyTpl"></ng-container>}<ng-content select="[slot=emptyState]"></ng-content></span><div #list [class]="listClasses()">@for (item of items; track item.id) {<article mol-activity-feed-item [item]="item"></article>}@if (footerTemplate(); as footerTpl) {<ng-container [ngTemplateOutlet]="footerTpl"></ng-container>}<ng-content select="[slot=footer]"></ng-content></div>`,
})
export class ActivityFeed implements AfterViewInit, AfterViewChecked, DoCheck {
  /** Items in display order (usually most-recent first). */
  items: ActivityFeedItemData[] = []

  /** Empty-state content, as an input (a template reference from a props change). */
  emptyState?: unknown

  /** Footer content, as an input (a template reference from a props change). */
  footer?: unknown

  /** Extra classes on the outer wrapper. */
  className?: string

  /** The projected empty-state capture point (unwrapped, so React's bare slot). */
  @ViewChild('empty') private empty?: ElementRef<HTMLElement>

  /** The feed wrapper (detached when the empty state renders instead). */
  @ViewChild('list') private list?: ElementRef<HTMLElement>

  private readonly guard = new SlotGuard(inject(ElementRef), inject(Renderer2))

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
   * Reconciles the projected empty state and the feed wrapper against React's
   * branch once the view queries resolve.
   */
  ngAfterViewInit(): void {
    this.reconcile()
  }

  /**
   * Re-reconciles on later passes, so a props step that empties or refills the
   * list swaps the branch the way React does.
   */
  ngDoCheck(): void {
    this.reconcile()
  }

  /**
   * Re-reconciles after each view update: a node-valued empty state that arrives
   * through an input renders into its outlet only during the update, so the
   * branch decision must be read afterwards.
   */
  ngAfterViewChecked(): void {
    this.reconcile()
  }

  /**
   * Applies React's condition: with no items and an empty state, the empty state
   * renders bare and the feed wrapper disappears; otherwise the wrapper renders
   * and the empty state is dropped.
   */
  private reconcile(): void {
    const empty = this.empty?.nativeElement
    const list = this.list?.nativeElement
    const hasEmpty = (this.items?.length ?? 0) === 0 && hasNodes(empty)
    this.guard.toggle(empty, hasEmpty)
    this.guard.toggle(list, !hasEmpty)
  }
}
