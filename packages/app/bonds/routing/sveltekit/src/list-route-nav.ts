/**
 * The types of {@link ListRouteNav} and the component itself, re-exported for the package
 * barrel: react-router's `ListRouteNavItem`, `ListRouteNavItemState` and `ListRouteNavProps`,
 * in Svelte's spelling.
 *
 * @module
 */

import type { Snippet } from 'svelte'
import type { SvelteHTMLElements } from 'svelte/elements'

import type { ListRouteResult, RouteParams } from '@molecule/app-routing'

import type { ListRouteAuth, ListRouteSelection } from './list-types.js'

export { default as ListRouteNav } from './ListRouteNav.svelte'

/** A named list view and its navigation label. */
export interface ListRouteNavItem extends ListRouteSelection {
  /**
   * Translated label: the text itself, or a snippet when it includes an icon (React's
   * `ReactNode`).
   */
  label: string | Snippet
  /** Path parameters for this destination; current route parameters are otherwise retained. */
  params?: RouteParams
  /** Keep the choice visible but prevent navigation. Authorization still belongs in the route. */
  disabled?: boolean
}

/** URL-derived state available to the app's link styling. */
export interface ListRouteNavItemState<Selection extends string = string> {
  /** The app-owned selection key. */
  selection: Selection
  /** Whether the current URL selects this view. */
  active: boolean
  /** Whether navigation is disabled for this choice. */
  disabled: boolean
}

/**
 * Props for URL-backed list navigation; local content panels use the UI package's Tabs
 * instead. It carries every native `<nav>` attribute React's prop type does (`id`, `class`,
 * data and ARIA attributes, event handlers), so one declaration serves both bonds.
 */
export interface ListRouteNavProps<Selection extends string = string> extends Omit<
  SvelteHTMLElements['nav'],
  'children'
> {
  /** Accessible navigation name, translated by the app. */
  'aria-label': string
  /** Every declared view stays visible on every route; labels and targets share one declaration. */
  selections: Record<Selection, ListRouteNavItem>
  /** Tie-breaker or fallback, with the same meaning as useListRoute's defaultSelection. */
  defaultSelection?: NoInfer<Selection>
  /** Pagination query key to remove on selection, defaulting to page. */
  pageParam?: string
  /** Required for protected selections, with the same readiness rules as useListRoute. */
  auth?: ListRouteAuth
  /** Render links in a list, with optional classes for the list and its items. */
  list?: { className?: string; itemClassName?: string }
  /** App-owned styling, resolved from its class map. */
  linkClassName?: string | ((state: ListRouteNavItemState<Selection>) => string | undefined)
  /**
   * Render the list beside the nav using its exact URL state, including resolved item
   * params (React's `children`): a snippet receiving the route the nav resolved.
   */
  children?: Snippet<[ListRouteResult<string, Selection>]>
}
