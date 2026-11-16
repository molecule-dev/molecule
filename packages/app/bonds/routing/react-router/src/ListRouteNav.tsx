/**
 * Navigation between URL-backed list views, using the same declaration for labels and destinations.
 *
 * @module
 */

import type { ComponentPropsWithoutRef, JSX, ReactNode } from 'react'
import { Link, useParams } from 'react-router'

import type { RouteParams } from '@molecule/app-routing'
import { generatePath } from '@molecule/app-routing'

import type { ListRouteAuth, ListRouteSelection } from './list-types.js'
import { useListRoute } from './useListRoute.js'

/** A named list view and its navigation label. */
export interface ListRouteNavItem extends ListRouteSelection {
  /** Translated label, optionally including an icon. */
  label: ReactNode
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

/** Props for URL-backed list navigation; local content panels use the UI package's Tabs instead. */
export interface ListRouteNavProps<Selection extends string = string> extends Omit<
  ComponentPropsWithoutRef<'nav'>,
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
  /** App-owned styling, resolved from its class map. */
  linkClassName?: string | ((state: ListRouteNavItemState<Selection>) => string | undefined)
}

/**
 * Render every declared list view as a router link. The URL selects the active choice, and
 * selecting any view resets pagination through useListRoute. Native link behavior (new-tab
 * clicks, keyboard activation and history) is preserved. This is a navigation landmark,
 * not an ARIA tablist with local panels. No active-value state or change handler is needed.
 *
 * @param props - Named destinations, translated labels, optional auth and native nav attributes.
 * @returns The navigation landmark and all its declared choices.
 */
export function ListRouteNav<Selection extends string>({
  selections,
  defaultSelection,
  pageParam,
  auth,
  linkClassName,
  ...rest
}: ListRouteNavProps<Selection>): JSX.Element {
  const routeParams = useParams()
  const currentParams: RouteParams = {}
  for (const [name, value] of Object.entries(routeParams)) {
    if (value !== undefined) currentParams[name] = value
  }
  // Resolve per-choice params before matching as well as before building links:
  // two choices can share /folders/:folder while naming different folders.
  const destinations = { ...selections }
  for (const [selection, item] of Object.entries(selections) as [Selection, ListRouteNavItem][]) {
    if (item.params) {
      destinations[selection] = {
        ...item,
        path: generatePath(item.path, { ...currentParams, ...item.params }),
      }
    }
  }
  const list = useListRoute({ selections: destinations, defaultSelection, pageParam, auth })

  return (
    <nav {...rest}>
      {(Object.entries(selections) as [Selection, ListRouteNavItem][]).map(([selection, item]) => {
        const active = list.selection === selection
        const disabled = item.disabled === true
        const className =
          typeof linkClassName === 'function'
            ? linkClassName({ selection, active, disabled })
            : linkClassName
        const attrs = {
          className,
          'data-state': active ? 'active' : 'inactive',
          'data-mol-id': `list-route-${selection}`,
          'aria-current': active ? ('page' as const) : undefined,
        }

        return disabled ? (
          <span key={selection} {...attrs} role="link" aria-disabled="true">
            {item.label}
          </span>
        ) : (
          <Link key={selection} {...attrs} to={list.href({ selection })}>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
