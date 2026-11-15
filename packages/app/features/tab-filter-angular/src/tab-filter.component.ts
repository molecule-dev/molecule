/**
 * TabFilter component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import type { TabFilterTab } from './types.js'

/** React's horizontal-scroll inline style while `scrollable` (the default). */
const SCROLL_STYLE = { overflowX: 'auto', whiteSpace: 'nowrap' } as const

/**
 * TabFilter component.
 *
 * Horizontal pill-style tab row used as a segmented filter. The host IS the
 * root `<div>` (`div[mol-tab-filter]`, `role="tablist"`), matching React's
 * root exactly. `defaultTab` stays reachable when `tabs` holds only the
 * path/query-selected filter, and a duplicate id appears once (using the
 * default tab's definition). Each enabled tab calls `onChange` with its own
 * id; `disabled` tabs are non-interactive.
 *
 * React keys each tab button by the tab's `id`, so a re-ordered or re-passed
 * array moves/keeps the rendered buttons per key; Angular's `@for` tracks the
 * same id.
 */
@Component({
  selector: 'div[mol-tab-filter]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['tabs', 'defaultTab', 'activeId', 'onChange', 'scrollable', 'filled', 'className'],
  host: {
    role: 'tablist',
    '[class]': 'classes()',
    '[style]': 'inlineStyleText()',
  },
  template: `@for (tab of visibleTabs(); track tab.id) {
    <button
      type="button"
      role="tab"
      [attr.aria-selected]="isActive(tab)"
      [attr.data-state]="isActive(tab) ? 'active' : 'inactive'"
      [attr.data-mol-id]="'tab-filter-' + tab.id"
      [disabled]="tab.disabled ?? false"
      (click)="select(tab)"
      [class]="tabClasses(tab)"
    >
      <span [class]="rowClasses()">
        @if (asTemplate(tab.icon); as iconTemplate) {
          <ng-container [ngTemplateOutlet]="iconTemplate" />
        }
        <span>
          @if (asTemplate(tab.label); as labelTemplate) {
            <ng-container [ngTemplateOutlet]="labelTemplate" />
          } @else {
            {{ tab.label }}
          }
        </span>
        @if (tab.count !== undefined) {
          <span [class]="countClasses()">{{ formatCount(tab.count) }}</span>
        }
      </span>
    </button>
  }`,
})
export class TabFilter {
  /** Tabs to render. */
  tabs: TabFilterTab[] = []
  /** Persistent collection/default view, retained even when tabs contains only the active filter. */
  defaultTab?: TabFilterTab
  /** Currently active tab id. */
  activeId = ''
  /** Called when an enabled tab is clicked. */
  onChange?: (id: string) => void
  /** Whether to allow the row to scroll horizontally (defaults to true at read time). */
  scrollable?: boolean
  /** Whether the pills are filled (defaults to true at read time). */
  filled?: boolean
  /** Extra classes. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The tabs to render: the default tab first (its definition wins for a
   * duplicate id), then every other tab in the order given.
   * @returns The visible tabs.
   */
  visibleTabs(): TabFilterTab[] {
    const defaultTab = this.defaultTab
    if (!defaultTab) return this.tabs
    return [defaultTab, ...this.tabs.filter((tab) => tab.id !== defaultTab.id)]
  }

  /**
   * Whether a tab is the active one.
   * @param tab - The tab.
   * @returns True for the active tab.
   */
  isActive(tab: TabFilterTab): boolean {
    return tab.id === this.activeId
  }

  /**
   * Calls `onChange` with the clicked tab's id (React's `onClick`).
   * @param tab - The clicked tab.
   */
  select(tab: TabFilterTab): void {
    this.onChange?.(tab.id)
  }

  /**
   * Computes the host class list (React's
   * `cm.cn(cm.flex({ align: 'center', gap: 'xs' }), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'xs' }), this.className)
  }

  /**
   * Computes one tab button's class list.
   * @param tab - The tab.
   * @returns The class string.
   */
  tabClasses(tab: TabFilterTab): string {
    const cm = this.cm()
    return cm.cn(
      cm.tabsTrigger({
        variant: this.isFilled() ? 'solid-rounded' : 'soft-rounded',
        size: 'md',
      }),
      this.isActive(tab) ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
      cm.touchTargetCompact,
    )
  }

  /**
   * The inner row's class (`cm.flex({ align: 'center', gap: 'xs' })`).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'xs' })
  }

  /**
   * The count badge's class (`cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))`).
   * @returns The class string.
   */
  countClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('medium'))
  }

  /**
   * The count badge's text, formatted like React (`toLocaleString`).
   * @param count - The tab's count.
   * @returns The parenthesized count.
   */
  formatCount(count: number | undefined): string {
    return `(${(count ?? 0).toLocaleString()})`
  }

  /**
   * Whether `scrollable` is on (React's default parameter: an absent or
   * later-cleared input still scrolls).
   * @returns True when the row scrolls horizontally.
   */
  isScrollable(): boolean {
    return this.scrollable ?? true
  }

  /**
   * Whether `filled` is on (React's default parameter).
   * @returns True for filled pills.
   */
  isFilled(): boolean {
    return this.filled ?? true
  }

  /**
   * The host's inline style text (React's
   * `style={scrollable ? { overflowX: 'auto', whiteSpace: 'nowrap' } : undefined}`),
   * or null when the row does not scroll, so no `style` attribute renders.
   * @returns The style text or null.
   */
  inlineStyleText(): string | null {
    return this.isScrollable() ? styleText(SCROLL_STYLE) : null
  }

  /**
   * Narrows a tab label or icon to its template form.
   * @param value - The prop value (text or template).
   * @returns The template, or null for text.
   */
  asTemplate(value: unknown): TemplateRef<unknown> | null {
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as TemplateRef<unknown>).createEmbeddedView === 'function'
    )
      return value as TemplateRef<unknown>
    return null
  }
}
