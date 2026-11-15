/**
 * Types of `@molecule/app-breadcrumb-angular` — the Angular counterpart of
 * `@molecule/app-breadcrumb-react`, same props and DOM.
 *
 * @module
 */

/**
 * Describes a single crumb entry in a breadcrumb trail. Node props
 * (`label`, `icon`) are projected or templated content in Angular (an
 * input cannot carry a node), so they are typed `unknown`: pass plain
 * strings or `<ng-template>` refs.
 */
export interface BreadcrumbItem {
  /** Display text or template for the crumb. */
  label?: unknown
  /**
   * Optional `to` target. When absent the crumb renders as plain text
   * (typically the current page).
   */
  to?: string
  /** Optional leading icon. */
  icon?: unknown
}

/**
 * Props accepted by {@link Breadcrumb} — the same props
 * `@molecule/app-breadcrumb-react` accepts. Node props (`separator`) are
 * projected content in Angular, so they are typed `unknown`: pass them in
 * the host template as `[slot=separator]`, not as values.
 */
export interface BreadcrumbProps {
  /** Ordered list of crumbs, last one usually the current page. */
  items?: BreadcrumbItem[]
  /**
   * Click handler invoked with the target `to` when an item is clicked.
   * Useful when wiring to a router. When omitted the component renders
   * items with an anchor `<a href={to}>`.
   */
  onNavigate?: (to: string) => void
  /** Separator between crumbs — defaults to a `/`; projected as `[slot=separator]`. */
  separator?: unknown
  /** Extra classes on the `<nav>` element. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
