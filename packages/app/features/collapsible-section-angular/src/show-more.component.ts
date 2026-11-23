/**
 * ShowMore component (React parity).
 *
 * @module
 */

import {
  type AfterViewChecked,
  type AfterViewInit,
  Component,
  ElementRef,
  inject,
  signal,
} from '@angular/core'

import { setElementPresent, useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * The nodes a projected list rendered: element children and the text children
 * that carry content (comment anchors are not items).
 *
 * @param root - The element that hosts the projected nodes.
 * @returns The item nodes, in document order.
 */
const itemNodes = (root: Element): (Element | Text)[] =>
  Array.from(root.childNodes).filter(
    (node): node is Element | Text =>
      node.nodeType === Node.ELEMENT_NODE ||
      (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== ''),
  )

/**
 * ShowMore component.
 *
 * "Show N more" / "Show less" toggle: React truncates its `children` array
 * with `children.slice(0, initialCount)`. Angular projects the items into the
 * host (`div[mol-show-more]`, matching React's root exactly) and a projected
 * list has no `length`, so {@link ShowMore.ngAfterViewInit} measures the
 * projected nodes once and {@link ShowMore.ngAfterViewChecked} detaches the ones past
 * `initialCount`, restoring them in order when expanded. The labels come from
 * `useTranslation()` (`showMore.more` / `showMore.less`), read reactively so a
 * locale switch refreshes them.
 */
@Component({
  selector: 'div[mol-show-more]',
  standalone: true,
  inputs: ['initialCount', 'moreKey', 'lessKey', 'className'],
  host: {
    '[class]': 'classes()',
  },
  template: `<ng-content></ng-content>
    @if (remaining() > 0) {
      <button type="button" (click)="toggle()" [class]="buttonClasses()">
        {{ label() }}
      </button>
    }`,
})
export class ShowMore implements AfterViewInit, AfterViewChecked {
  /** Number to show initially (defaults to 3 at read time). */
  initialCount?: number
  /** i18n key for the "Show more" label (defaults to `showMore.more`). */
  moreKey?: string
  /** i18n key for the "Show less" label (defaults to `showMore.less`). */
  lessKey?: string
  /** Extra classes. */
  className?: string

  /** The host element (the root `<div>`), which holds the projected items. */
  private readonly host = inject(ElementRef) as ElementRef<HTMLElement>
  /** Reactive translation, read in the injection context. */
  private readonly i18n = useTranslation()
  /** Whether every item shows (React's `expanded`). */
  private readonly expanded = signal(false)
  /** How many items were projected (-1 until measured). */
  private readonly count = signal(-1)
  /** The projected item nodes, in document order (captured once). */
  private items: (Element | Text)[] = []

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the root div's class list (React's `cm.cn(cm.stack(2), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(2), this.className)
  }

  /**
   * Computes the toggle button's class list.
   * @returns The class string.
   */
  buttonClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'), this.cm().link)
  }

  /**
   * React's `initialCount = 3` default parameter.
   * @returns The initial count.
   */
  initial(): number {
    return this.initialCount ?? 3
  }

  /**
   * How many items the toggle reveals (React's `Math.max(0, children.length - initialCount)`).
   * @returns The remaining count; 0 until the projected items are measured.
   */
  remaining(): number {
    return this.count() < 0 ? 0 : Math.max(0, this.count() - this.initial())
  }

  /**
   * The toggle's label — the "Show N more" text, or "Show less" when expanded.
   * @returns The label text.
   */
  label(): string {
    if (this.expanded())
      return this.i18n.t(this.lessKey ?? 'showMore.less', {}, { defaultValue: 'Show less' })
    const remaining = this.remaining()
    return this.i18n.t(
      this.moreKey ?? 'showMore.more',
      { remaining },
      { defaultValue: `Show ${remaining} more` },
    )
  }

  /** Flips the expanded state (React's `setExpanded((x) => !x)`). */
  toggle(): void {
    this.expanded.set(!this.expanded())
  }

  /**
   * Measures the projected items (view queries and projection resolve only at
   * view init) and reconciles the DOM with React's slice.
   */
  ngAfterViewInit(): void {
    this.items = itemNodes(this.host.nativeElement)
    this.count.set(this.items.length)
    this.reconcile()
  }

  /**
   * Re-reconciles after the view is checked: an input write (a props step may
   * change `initialCount`) or the toggle button being created alongside the
   * hidden items.
   */
  ngAfterViewChecked(): void {
    this.reconcile()
  }

  /**
   * Shows the first `initialCount` items (all of them when expanded) and hides
   * the rest, as React's `children.slice(0, initialCount)` renders — each item
   * put back in its own place, never moved for the list.
   */
  private reconcile(): void {
    if (this.items.length === 0) return
    const visible = this.expanded() ? this.items.length : this.initial()
    for (const [index, node] of this.items.entries()) {
      setElementPresent(node, index < visible)
    }
  }
}
