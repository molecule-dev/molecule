/**
 * Types of `@molecule/app-tab-filter-svelte` — the Svelte counterpart of
 * `@molecule/app-tab-filter-react`, same props and DOM.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Shape of a single tab entry passed to {@link TabFilter}. */
export interface TabFilterTab {
  /** Unique id / state key. */
  id: string
  /** Display label: translated text, or a snippet rendering any node. */
  label: string | Snippet
  /** Optional leading icon: text, or a snippet rendering any node. */
  icon?: string | Snippet
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
