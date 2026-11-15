/**
 * Types for the Vue tab-style filter with inline count badges.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Shape of a single tab entry passed to {@link TabFilter}. */
export interface TabFilterTab {
  /** Unique id / state key. */
  id: string
  /** Display label. Pass translated text, or any node. */
  label: VNodeChild
  /** Optional leading icon. */
  icon?: VNodeChild
  /** Optional count badge (e.g. number of items matching this filter). */
  count?: number
  /** When true, the tab renders disabled. */
  disabled?: boolean
}

/** Props accepted by the {@link TabFilter} component. */
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
