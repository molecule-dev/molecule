/**
 * Navigation between URL-backed list views, using the same declaration for labels and
 * destinations. Solid's counterpart of react-router's `ListRouteNav`: it renders its own
 * anchors over the bond's molecule `Router`, so the DOM matches React's exactly.
 *
 * @module
 */

import { useParams } from '@solidjs/router'
import { createMemo, For, type JSX, splitProps } from 'solid-js'

import type { RouteParams } from '@molecule/app-routing'
import { followRouterLink, generatePath } from '@molecule/app-routing'

import { decodeParam } from './decode-param.js'
import { useMoleculeRouter } from './hooks.jsx'
import type { ListRouteAuth, ListRouteResult, ListRouteSelection } from './list-types.js'
import { useListRoute } from './use-list-route.js'

/** A named list view and its navigation label. */
export interface ListRouteNavItem extends ListRouteSelection {
  /** Translated label, optionally including an icon. */
  label: JSX.Element
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
  JSX.HTMLAttributes<HTMLElement>,
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
  /** Render the list beside the nav using its exact URL state, including resolved item params. */
  children?: (route: ListRouteResult<string, Selection>) => JSX.Element
}

/**
 * Render every declared list view as a router link. The URL selects the active choice, and
 * selecting any view resets pagination through useListRoute. Native link behavior (new-tab
 * clicks, keyboard activation and history) is preserved. This is a navigation landmark,
 * not an ARIA tablist with local panels. No active-value state or change handler is needed.
 * When children are supplied, they render after the navigation landmark. Put loading and
 * empty results in that branch so a pending list never removes the filter controls.
 *
 * @param props - Named destinations, translated labels, optional auth and native nav attributes.
 * @returns The navigation landmark with all its choices, followed by any rendered content.
 */
export function ListRouteNav<Selection extends string>(
  props: ListRouteNavProps<Selection>,
): JSX.Element {
  const router = useMoleculeRouter()
  const nativeParams = useParams()
  const [local, nav] = splitProps(props, [
    'selections',
    'defaultSelection',
    'pageParam',
    'auth',
    'list',
    'linkClassName',
    'children',
  ])

  const currentParams = createMemo((): RouteParams => {
    const params: RouteParams = {}
    for (const [name, value] of Object.entries(nativeParams)) {
      if (typeof value === 'string') params[name] = decodeParam(value)
    }
    return params
  })

  // Resolve per-choice params before matching as well as before building links:
  // two choices can share /folders/:folder while naming different folders.
  const destinations = createMemo((): Record<Selection, ListRouteNavItem> => {
    const current = currentParams()
    const resolved: Record<Selection, ListRouteNavItem> = { ...local.selections }
    for (const [selection, item] of Object.entries(local.selections) as [
      Selection,
      ListRouteNavItem,
    ][]) {
      if (item.params) {
        resolved[selection] = {
          ...item,
          path: generatePath(item.path, { ...current, ...item.params }),
        }
      }
    }
    return resolved
  })

  const route = useListRoute<string, Selection>(() => ({
    selections: destinations(),
    defaultSelection: local.defaultSelection,
    pageParam: local.pageParam,
    auth: local.auth,
  }))

  // React re-renders `children` on every navigation with plain values; here the same
  // values come from a memo, so a child expression re-runs when the URL changes.
  const result = createMemo((): ListRouteResult<string, Selection> => ({
    page: route.page(),
    pageSize: route.pageSize(),
    offset: route.offset(),
    filters: route.filters(),
    selection: route.selection(),
    params: route.params(),
    canLoad: route.canLoad(),
    status: route.status(),
    redirectTo: route.redirectTo(),
    href: route.href,
    navigate: route.navigate,
    setPage: route.setPage,
    setFilters: route.setFilters,
    select: route.select,
  }))

  const choices = createMemo(
    () => Object.entries(local.selections) as [Selection, ListRouteNavItem][],
  )

  const linkAttributes = (
    selection: Selection,
    item: ListRouteNavItem,
  ): {
    active: () => boolean
    className: () => string | undefined
  } => ({
    active: () => result().selection === selection,
    className: () =>
      typeof local.linkClassName === 'function'
        ? local.linkClassName({
            selection,
            active: result().selection === selection,
            disabled: item.disabled === true,
          })
        : local.linkClassName,
  })

  const choice = (selection: Selection, item: ListRouteNavItem): JSX.Element => {
    const attrs = linkAttributes(selection, item)
    if (item.disabled === true) {
      return (
        <span
          class={attrs.className()}
          data-state={attrs.active() ? 'active' : 'inactive'}
          data-mol-id={`list-route-${selection}`}
          aria-current={attrs.active() ? 'page' : undefined}
          role="link"
          aria-disabled="true"
        >
          {item.label}
        </span>
      )
    }
    const to = (): string => result().href({ selection })
    return (
      <a
        class={attrs.className()}
        data-state={attrs.active() ? 'active' : 'inactive'}
        data-mol-id={`list-route-${selection}`}
        aria-current={attrs.active() ? 'page' : undefined}
        href={router.createHref(to())}
        onClick={(event) => followRouterLink(event, to(), router)}
      >
        {item.label}
      </a>
    )
  }

  const links = (
    <For each={choices()}>
      {([selection, item]) =>
        local.list ? (
          <li class={local.list.itemClassName}>{choice(selection, item)}</li>
        ) : (
          choice(selection, item)
        )
      }
    </For>
  )

  return (
    <>
      <nav {...nav}>{local.list ? <ul class={local.list.className}>{links}</ul> : links}</nav>
      {local.children?.(result())}
    </>
  )
}
