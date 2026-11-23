/**
 * ShowMore component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, signal, ViewChild } from '@angular/core'

import {
  heldElement,
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * ShowMore component.
 *
 * "Show N more" / "Show less" toggle: React truncates its `children` array
 * with `children.slice(0, initialCount)`. Angular projects the items into the
 * host (`div[mol-show-more]`, matching React's root exactly) and a projected
 * list has no `length`, so {@link ShowMore.reconcile} counts the slot's
 * children whenever they change and takes the ones past `initialCount` out of
 * the page, each in its own place, putting them back when expanded. The labels come from `useTranslation()`
 * (`showMore.more` / `showMore.less`), read reactively so a locale switch
 * refreshes them.
 */
@Component({
  selector: 'div[mol-show-more]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['initialCount', 'moreKey', 'lessKey', 'className'],
  host: {
    '[class]': 'classes()',
  },
  template: `<span #items><ng-content></ng-content></span>
    @if (remaining() > 0) {
      <button type="button" (click)="toggle()" [class]="buttonClasses()">
        {{ label() }}
      </button>
    }`,
})
export class ShowMore {
  /** Number to show initially (defaults to 3 at read time). */
  initialCount?: number
  /** i18n key for the "Show more" label (defaults to `showMore.more`). */
  moreKey?: string
  /** i18n key for the "Show less" label (defaults to `showMore.less`). */
  lessKey?: string
  /** Extra classes. */
  className?: string

  /** The capture of the items; they render where it stands, directly in the root. */
  @ViewChild('items', { static: true }) private readonly itemsCapture?: ElementRef<HTMLElement>
  /** Reactive translation, read in the injection context. */
  private readonly i18n = useTranslation()
  /** Whether every item shows (React's `expanded`). */
  private readonly expanded = signal(false)
  /** How many items were projected (-1 until measured). */
  private readonly count = signal(-1)
  /** The items this component took out of the page (past `initialCount`). */
  private readonly hidden = new Set<Node>()

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
   * Counts the slot's children (React's `children.length`) and shows the first
   * `initialCount` of them (all of them when expanded), as React's
   * `children.slice(0, initialCount)` renders. An item this component hid is
   * listed by its placeholder, so it is found again through it; items a
   * consumer adds, removes or reorders later are counted the same way.
   *
   * @param hasContent - Reads the slot's children.
   */
  private reconcile(hasContent: SlotReader): void {
    const capture = this.itemsCapture?.nativeElement
    placeContentBefore(capture, capture)
    setElementPresent(capture, false)
    const items = hasContent.nodes(capture).map((node) => {
      const held = heldElement(node)
      return held !== undefined && this.hidden.has(held) ? held : node
    })
    this.count.set(items.length)
    const visible = this.expanded() ? items.length : this.initial()
    this.hidden.clear()
    for (const [index, node] of items.entries()) {
      const shown = index < visible
      setElementPresent(node, shown)
      if (!shown) this.hidden.add(node)
    }
  }
}
