/**
 * Types of `@molecule/app-breadcrumb-vue` — the Vue counterpart of
 * `@molecule/app-breadcrumb-react`, same props and DOM.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Describes a single crumb entry in a breadcrumb trail. */
export interface BreadcrumbItem {
  /** Display text or VNode for the crumb. */
  label: VNodeChild
  /**
   * Optional `to` target. When absent the crumb renders as plain text
   * (typically the current page).
   */
  to?: string
  /** Optional leading icon. */
  icon?: VNodeChild
}

/** Props accepted by the {@link Breadcrumb} component. */
export interface BreadcrumbProps {
  /** Ordered list of crumbs, last one usually the current page. */
  items: BreadcrumbItem[]
  /**
   * Click handler invoked with the target `to` when an item is clicked.
   * Useful when wiring to a router. When omitted the component renders
   * items with an anchor `<a href={to}>`. Bind it as `:on-navigate="…"`
   * (or listen for `@navigate`).
   */
  onNavigate?: (to: string) => void
  /** Separator between crumbs — defaults to a `/`. Accepts any node. */
  separator?: VNodeChild
  /** Extra classes on the `<nav>` element. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
