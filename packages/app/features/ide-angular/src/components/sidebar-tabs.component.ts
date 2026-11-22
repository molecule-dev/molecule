/**
 * Sidebar tab switcher — toggles between file explorer and search panel.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `SidebarTabs` (see that
 * file for the design notes): the same inputs (React prop names), the same DOM
 * for the same input, the same callbacks. The host element IS React's root
 * `div` (an attribute selector), so the root's classes and inline style sit on
 * it through host bindings; the tablist, the two `role="tab"` buttons and the
 * scrolling content area (the projected children) are the template.
 *
 * Derived values are methods the template reads, so each change-detection pass
 * renders the current state the way React's render does. Styling uses
 * `getClassMap()` (`cm.*`); the only inline styles are layout the ClassMap
 * can't express, bound per property so each value is applied through the DOM's
 * own CSS parser exactly the way React applies its style object. All
 * user-facing text goes through `t()`.
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { Icon } from './icon.component.js'

/**
 * Properties for the sidebar tab switcher — React's own contract.
 */
export interface SidebarTabsProps {
  /** Currently active sidebar tab. */
  activeTab: 'files' | 'search'
  /** Called when the user switches tabs. */
  onTabChange: (tab: 'files' | 'search') => void
  /** Tab content rendered below the tab buttons (projected content). */
  children?: unknown
  className?: string
}

/**
 * Sidebar tab strip with file explorer and search icons.
 */
@Component({
  selector: 'div[mol-sidebar-tabs]',
  standalone: true,
  imports: [Icon],
  inputs: ['activeTab', 'onTabChange', 'className'],
  host: {
    '[class]': 'rootClass()',
    '[style.display]': '"flex"',
    '[style.flex-direction]': '"column"',
  },
  // prettier-ignore
  template: `<div role="tablist" [attr.aria-label]="tabsLabel()" [class]="tablistClass()">
      <button type="button" data-mol-id="sidebar-tab-files" role="tab" [attr.aria-selected]="filesActive ? 'true' : 'false'" (click)="selectFiles()" [attr.title]="filesLabel()" [attr.aria-label]="filesLabel()" [class]="filesClass()" [style.user-select]="'none'" [style.height]="'32px'" [style.flex]="'1'" [style.justify-content]="'center'"><svg mol-icon [name]="'folder'" [size]="16" aria-hidden="true" [style.opacity]="filesActive ? '1' : '0.6'"></svg></button>
      <button type="button" data-mol-id="sidebar-tab-search" role="tab" [attr.aria-selected]="searchActive ? 'true' : 'false'" (click)="selectSearch()" [attr.title]="searchLabel()" [attr.aria-label]="searchLabel()" [class]="searchClass()" [style.user-select]="'none'" [style.height]="'32px'" [style.flex]="'1'" [style.justify-content]="'center'"><svg mol-icon [name]="'search'" [size]="16" aria-hidden="true" [style.opacity]="searchActive ? '1' : '0.6'"></svg></button>
    </div>
    <div [style.flex]="'1'" [style.min-height]="'0px'" [style.overflow]="'auto'"><ng-content /></div>`,
})
export class SidebarTabs {
  /** Currently active sidebar tab. */
  activeTab: 'files' | 'search' = 'files'

  /** Called when the user switches tabs. */
  onTabChange: (tab: 'files' | 'search') => void = () => {}

  /** Extra classes for the root. */
  className?: string

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the labels. */
  protected readonly t = this.i18n.t

  /**
   * Whether the files tab is the active one.
   * @returns True for `'files'`.
   */
  protected get filesActive(): boolean {
    return this.activeTab === 'files'
  }

  /**
   * Whether the search tab is the active one.
   * @returns True for `'search'`.
   */
  protected get searchActive(): boolean {
    return this.activeTab === 'search'
  }

  /**
   * Selects the files tab.
   */
  protected selectFiles(): void {
    this.onTabChange('files')
  }

  /**
   * Selects the search tab.
   */
  protected selectSearch(): void {
    this.onTabChange('search')
  }

  /**
   * The tablist's accessible name.
   * @returns The translated label.
   */
  protected tabsLabel(): string {
    return this.t('ide.sidebar.tabs', undefined, { defaultValue: 'Sidebar' })
  }

  /**
   * The files tab's accessible name and hover text.
   * @returns The translated label.
   */
  protected filesLabel(): string {
    return this.t('ide.sidebar.files', undefined, { defaultValue: 'Explorer' })
  }

  /**
   * The search tab's accessible name and hover text.
   * @returns The translated label.
   */
  protected searchLabel(): string {
    return this.t('ide.sidebar.search', undefined, { defaultValue: 'Search' })
  }

  /**
   * The root's classes: the full-height column, the right border and the
   * host's extra classes, composed exactly as React composes them.
   * @returns The resolved class string.
   */
  protected rootClass(): string {
    return this.cm.cn(this.cm.h('full'), this.cm.borderR, this.className)
  }

  /**
   * The tablist strip's classes: the centered row on the secondary surface,
   * above a hairline border.
   * @returns The resolved class string.
   */
  protected tablistClass(): string {
    return this.cm.cn(
      this.cm.flex({ direction: 'row', align: 'center' }),
      this.cm.shrink0,
      this.cm.surfaceSecondary,
      this.cm.borderB,
    )
  }

  /**
   * The files tab's classes: the shared tab look plus this tab's right border,
   * with the active surface and primary underline when selected. Icon-only
   * standalone control → the full 44px coarse floor, from the ClassMap rather
   * than a hand-computed height (min-height beats the 32px compact height on
   * touch, exactly as before).
   * @returns The resolved class string.
   */
  protected filesClass(): string {
    return this.cm.cn(
      this.cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
      this.cm.sp('px', 3),
      this.cm.textSize('sm'),
      this.cm.shrink0,
      this.cm.cursorPointer,
      this.cm.touchTarget,
      this.cm.borderR,
      this.filesActive && this.cm.surface,
      this.filesActive && this.cm.borderBPrimary,
    )
  }

  /**
   * The search tab's classes: the shared tab look, with the active surface and
   * primary underline when selected (no right border — its sibling carries the
   * one divider). Same 44px coarse floor as its sibling — one tab strip, one
   * rule.
   * @returns The resolved class string.
   */
  protected searchClass(): string {
    return this.cm.cn(
      this.cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
      this.cm.sp('px', 3),
      this.cm.textSize('sm'),
      this.cm.shrink0,
      this.cm.cursorPointer,
      this.cm.touchTarget,
      this.searchActive && this.cm.surface,
      this.searchActive && this.cm.borderBPrimary,
    )
  }
}
