/**
 * Types of `@molecule/app-tab-filter-angular` — the Angular counterpart of
 * `@molecule/app-tab-filter-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/** Shape of a single tab entry passed to {@link TabFilter}. */
export interface TabFilterTab {
  /** Unique id / state key. */
  id: string
  /** Display label: text, or a `TemplateRef` projected as its content. */
  label: string | TemplateRef<unknown>
  /** Optional leading icon: text, or a `TemplateRef` projected as its content. */
  icon?: string | TemplateRef<unknown>
  /** Optional count badge (e.g. number of items matching this filter). */
  count?: number
  /** When true, the tab renders disabled. */
  disabled?: boolean
}

/**
 * Props accepted by {@link TabFilter} — the same props
 * `@molecule/app-tab-filter-react` accepts. Tab labels and icons are data
 * values here: text, or a `TemplateRef` from an `<ng-template>` in the host
 * template.
 */
export interface TabFilterProps {
  /** Tabs to render. */
  tabs: TabFilterTab[]
  /** Persistent collection/default view, retained even when tabs contains only the active filter. */
  defaultTab?: TabFilterTab
  /** Currently active tab id. */
  activeId: string
  /** Called when an enabled tab is clicked. */
  onChange: (id: string) => void
  /** Whether to allow the row to scroll horizontally. Defaults to true. */
  scrollable?: boolean
  /**
   * When `true` (default), draws filled-pill backgrounds matching the
   * polished flagship apps. Pass `false` for the older bare-text-only style.
   */
  filled?: boolean
  /** Extra classes. */
  className?: string
}
