/**
 * `useListRoute` over Solid Router: the list rules come from `@molecule/app-routing`'s
 * `resolveListRoute`, which every framework's `useListRoute` shares.
 *
 * @module
 */

import { useLocation } from '@solidjs/router'
import { type Accessor, createEffect, createMemo } from 'solid-js'

import type {
  ListRouteChange,
  ListRouteOptions,
  ListRouteRedirect,
  ListRouteResult,
  ListRouteSource,
  NavigateOptions,
  RouteParams,
} from '@molecule/app-routing'
import { listRouteRedirect, resolveListRoute } from '@molecule/app-routing'

import { useMoleculeRouter } from './hooks.jsx'

/**
 * What {@link useListRoute} returns: each list-state field as an accessor, and the link
 * builder and navigation actions as plain functions — the shape `@molecule/app-solid`'s
 * `useListRoute` returns (React's `ListRouteResult` under Solid's value shape).
 */
export interface UseListRouteResult<
  Filter extends string = string,
  Selection extends string = string,
> {
  /** Current 1-indexed page. */
  readonly page: Accessor<number>
  /** Configured items per page. */
  readonly pageSize: Accessor<number>
  /** Zero-indexed item offset for an API request. */
  readonly offset: Accessor<number>
  /** Current URL filter values, including values supplied by path parameters. */
  readonly filters: Accessor<Record<Filter, string | undefined>>
  /** Matching view, or the configured fallback. */
  readonly selection: Accessor<Selection | undefined>
  /** Decoded current path parameters, also usable as API-only filters. */
  readonly params: Accessor<RouteParams>
  /** False while a protected selection is awaiting auth, signed out, or unavailable. */
  readonly canLoad: Accessor<boolean>
  /** Readiness for the current view. A public view always stays ready. */
  readonly status: Accessor<ListRouteResult<Filter, Selection>['status']>
  /** Sign-in destination while a signed-out protected view is being redirected. */
  readonly redirectTo: Accessor<string | undefined>
  /** Build a real link target, preserving the current pathname, unrelated query values and hash. */
  readonly href: ListRouteResult<Filter, Selection>['href']
  /** Navigate atomically. Location state is preserved unless options explicitly replace it. */
  readonly navigate: ListRouteResult<Filter, Selection>['navigate']
  /** Change only the page, retaining the current filters and view. */
  readonly setPage: ListRouteResult<Filter, Selection>['setPage']
  /** Patch URL filters and return to page one. */
  readonly setFilters: ListRouteResult<Filter, Selection>['setFilters']
  /** Select a configured view at page one, preserving current route parameters. */
  readonly select: ListRouteResult<Filter, Selection>['select']
}

/**
 * The options {@link useListRoute} takes: a plain object, or an accessor of one when the
 * app's auth status changes on the same mounted component (a new status re-resolves the
 * list, the way React re-renders `useListRoute`).
 */
export type ListRouteOptionsInput<
  Filter extends string = string,
  Selection extends string = string,
> = ListRouteOptions<Filter, Selection> | (() => ListRouteOptions<Filter, Selection>)

/**
 * Own URL-backed pagination, filters and selected views without mirrored state or navigation effects.
 * Works inside any Solid Router (`<Router>`, `<HashRouter>`, `<MemoryRouter>`); no data-router
 * feature or `MoleculeRouterProvider` is needed — a provider supplies named routes and the
 * non-Solid `@molecule/app-routing` bond, nothing this hook requires. Ordinary links, direct
 * visits and Back/Forward all read the same URL. Page links retain path parameters and unrelated
 * queries; changing filters or views resets the page atomically. Protected views wait for auth
 * and redirect only a confirmed signed-out session, with `state.returnTo` set.
 *
 * @param options - App-owned filter sources, view paths, pagination and optional auth
 *   readiness, or an accessor of them (a new auth status re-resolves the list).
 * @returns Reactive list state plus link builders and navigation actions. Gate data queries with `canLoad`.
 */
export function useListRoute<Filter extends string = string, Selection extends string = string>(
  options: ListRouteOptionsInput<Filter, Selection> = {},
): UseListRouteResult<Filter, Selection> {
  const router = useMoleculeRouter()
  const location = useLocation()

  const readOptions = (): ListRouteOptions<Filter, Selection> =>
    typeof options === 'function' ? options() : options

  // The native location is the reactive source; the bond's router reads the same commit
  // and carries the entry's state and key (a memory router's from its history).
  const source = (): ListRouteSource => {
    void location.pathname
    void location.search
    void location.hash
    return { location: router.getLocation(), routeParams: router.getParams() }
  }

  const list = createMemo(() =>
    resolveListRoute<Filter, Selection>(source(), readOptions(), router.navigate),
  )

  // The redirect target, deduplicated so a location change that computes the same target
  // re-runs nothing (React's effect keyed on `redirectTo` and `returnTo`).
  const redirect = createMemo((previous: ListRouteRedirect | undefined) => {
    const next = listRouteRedirect(list(), router.getLocation())
    return next !== undefined &&
      previous !== undefined &&
      next.to === previous.to &&
      next.options.state.returnTo === previous.options.state.returnTo
      ? previous
      : next
  })

  createEffect(() => {
    const target = redirect()
    if (target === undefined) return
    void router.navigate(target.to, target.options)
  })

  return {
    page: () => list().page,
    pageSize: () => list().pageSize,
    offset: () => list().offset,
    filters: () => list().filters,
    selection: () => list().selection,
    params: () => list().params,
    canLoad: () => list().canLoad,
    status: () => list().status,
    redirectTo: () => list().redirectTo,
    href: (change?: ListRouteChange<Filter, Selection>) => list().href(change),
    navigate: (change: ListRouteChange<Filter, Selection>, navOptions?: NavigateOptions) =>
      list().navigate(change, navOptions),
    setPage: (page: number, navOptions?: NavigateOptions) => list().setPage(page, navOptions),
    setFilters: (
      filters: Partial<Record<Filter, string | undefined>>,
      navOptions?: NavigateOptions,
    ) => list().setFilters(filters, navOptions),
    select: (selection: Selection, navOptions?: NavigateOptions) =>
      list().select(selection, navOptions),
  }
}
