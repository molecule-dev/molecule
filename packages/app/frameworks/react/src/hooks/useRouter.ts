/**
 * React hook for routing.
 *
 * @module
 */

import { useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react'

import { I18nError } from '@molecule/app-i18n'
import type {
  ListRouteOptions,
  ListRouteResult,
  NavigateOptions,
  QueryParams,
  RouteLocation,
  RouteParams,
  Router,
} from '@molecule/app-routing'
import {
  createConsumedSearchParam,
  listRouteRedirect,
  resolveLinkPath,
  resolveListRoute,
} from '@molecule/app-routing'

import { RouterContext } from '../contexts.js'
import { RouteParamsHookContext } from '../route-params-hook-context.js'
import type { UseRouterResult } from '../types.js'

/**
 * The router the routing hooks and `Link` navigate through: the one mounted
 * above the caller. Both {@link useRouterInstance} and {@link useLinkRouter}
 * fail through this one function, so the error and its text live in one place.
 *
 * @param router - The router read from context, or `null` with none mounted.
 * @returns The router.
 * @throws {I18nError} When no router is mounted above the caller: mount a router component from
 * the app's routing bond (`BrowserRouter` from `@molecule/app-routing-react-router`), or pass
 * `router` to `MoleculeProvider`.
 */
function requireRouter(router: Router | null): Router {
  if (!router) {
    throw new I18nError(
      'react.error.useRouterOutsideProvider',
      undefined,
      "No router here. Mount a router component from the app's routing bond (`BrowserRouter` from `@molecule/app-routing-react-router`), or pass `router` to `MoleculeProvider`. If the app already does this, its routing bond is older than this binding: update it (`npm install @molecule/app-routing-react-router@latest`).",
    )
  }
  return router
}

/**
 * Hook to access the router from context.
 *
 * @returns The router from context
 * @throws {I18nError} When no router is mounted above the caller: mount a router component from
 * the app's routing bond (`BrowserRouter` from `@molecule/app-routing-react-router`), or pass
 * `router` to `MoleculeProvider`.
 */
export function useRouterInstance(): Router {
  return requireRouter(useContext(RouterContext))
}

/**
 * Hook for the router a link to `to` navigates through: the mounted router,
 * or `null` when `to` is a URL outside the app and none is mounted. The
 * browser, or the device's URL handler, opens such a URL, so a link to it
 * renders in a tree with no router (a widget, a static page). A link to an
 * app path still fails without one: that is how an app that forgot to mount
 * its router finds out.
 *
 * `Link` uses it. Use it for a component of your own that follows a link's
 * destination; `Link`'s JSDoc gives the click rule such a component keeps.
 *
 * @param to - The link's destination: an app path (`/settings?tab=billing#plan`) or a URL.
 * @returns The mounted router, or `null` for a URL outside the app with no router mounted.
 * @throws {I18nError} When `to` is an app path and no router is mounted above the caller: the
 * error {@link useRouterInstance} throws, with the same fix.
 *
 * @example
 * ```tsx
 * import { routerLinkHref } from '@molecule/app-routing'
 *
 * const router = useLinkRouter(to)
 * return <a href={router === null ? to : routerLinkHref(to, router)}>{children}</a>
 * ```
 */
export function useLinkRouter(to: string): Router | null {
  const router = useContext(RouterContext)
  // A URL outside the app opens through the browser or the device's URL handler: no router navigates it.
  if (resolveLinkPath(to) === null) return router
  return requireRouter(router)
}

/** What the routing hooks render: the router's location, route params and query. */
interface RouterSnapshot {
  location: RouteLocation
  params: RouteParams
  query: QueryParams
}

/** The last snapshot read from each router, kept while the router's answers stay the same. */
const snapshots = new WeakMap<Router, RouterSnapshot>()

/**
 * Whether two values of a param or query map are the same (a repeated query key is an array).
 *
 * @param a - One value.
 * @param b - The other.
 * @returns Whether they are equal.
 */
const sameValue = (a: string | string[] | undefined, b: string | string[] | undefined): boolean =>
  Array.isArray(a) && Array.isArray(b)
    ? a.length === b.length && a.every((item, i) => item === b[i])
    : a === b

/**
 * Whether two param or query maps hold the same entries.
 *
 * @param a - One map.
 * @param b - The other.
 * @returns Whether they are equal.
 */
const sameEntries = (a: QueryParams, b: QueryParams): boolean => {
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every((key) => sameValue(a[key], b[key]))
}

/**
 * Whether two locations are the same entry at the same address. A key names an entry and its
 * state together; without one, the state is compared by identity.
 *
 * @param a - One location.
 * @param b - The other.
 * @returns Whether they are equal.
 */
const sameLocation = (a: RouteLocation, b: RouteLocation): boolean =>
  a.pathname === b.pathname &&
  a.search === b.search &&
  a.hash === b.hash &&
  a.key === b.key &&
  (a.key !== undefined || Object.is(a.state, b.state))

/**
 * Reads the router's location, params and query, returning the previous snapshot while they are
 * unchanged: a routing bond may build a new location object on every call, and
 * `useSyncExternalStore` needs the same value back until something changed.
 *
 * @param router - The router to read.
 * @returns Its current snapshot.
 */
function readSnapshot(router: Router): RouterSnapshot {
  const next = {
    location: router.getLocation(),
    params: router.getParams(),
    query: router.getQuery(),
  }
  const previous = snapshots.get(router)
  if (
    previous &&
    sameLocation(previous.location, next.location) &&
    sameEntries(previous.params, next.params) &&
    sameEntries(previous.query, next.query)
  )
    return previous
  snapshots.set(router, next)
  return next
}

/**
 * The router's location, params and query as of this render. Read during render, not copied
 * into state from a notification: a routing bond answers with the new location as soon as its
 * own tree re-renders and notifies after that commit, so a copy rendered the previous location
 * for one commit (a whole-tree guard mounted the protected page before redirecting).
 *
 * @param router - The router to read.
 * @returns The snapshot this render shows.
 */
function useRouterSnapshot(router: Router): RouterSnapshot {
  const subscribe = useCallback((onChange: () => void) => router.subscribe(onChange), [router])
  const getSnapshot = useCallback(() => readSnapshot(router), [router])
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** The route-params hook of a routing bond that has none: the router's params answer. */
const useNoRouteParams = (): RouteParams | undefined => undefined

/**
 * The route params the caller shows: the ones the routing bond's `useRouteParams` hook gives
 * for the calling component when it gives any, otherwise the router's (React Router's
 * declarative routers know a route's params only inside the matched route). The previous object
 * is kept while the entries are the same.
 *
 * @param routerParams - The router's params, from this render's snapshot.
 * @returns The params.
 */
function useCallerParams(routerParams: RouteParams): RouteParams {
  // The provider reads the hook once, so this call is the same hook on every render.
  const useRouteParams = useContext(RouteParamsHookContext) ?? useNoRouteParams
  const own = useRouteParams()
  const next = own && Object.keys(own).length > 0 ? own : routerParams
  const [held, setHeld] = useState(next)
  const current = sameEntries(held, next) ? held : next
  if (current !== held) setHeld(current)
  return current
}

/**
 * Hook for routing state and actions.
 *
 * @returns Router state and navigation methods
 *
 * @example
 * ```tsx
 * const { location, params, navigate, back } = useRouter()
 *
 * return (
 *   <div>
 *     <p>Current path: {location.pathname}</p>
 *     <button onClick={() => navigate('/home')}>Go Home</button>
 *   </div>
 * )
 * ```
 */
export function useRouter(): UseRouterResult {
  const router = useRouterInstance()
  const { location, params: routerParams, query } = useRouterSnapshot(router)
  const params = useCallerParams(routerParams)

  // Memoized action wrappers
  const navigate = useCallback(
    (path: string, options?: NavigateOptions) => router.navigate(path, options),
    [router],
  )

  const navigateTo = useCallback(
    (name: string, params?: RouteParams, query?: QueryParams, options?: NavigateOptions) =>
      router.navigateTo(name, params, query, options),
    [router],
  )

  const back = useCallback(() => router.back(), [router])
  const forward = useCallback(() => router.forward(), [router])

  const isActive = useCallback(
    (path: string, exact?: boolean) => router.isActive(path, exact),
    [router],
  )

  return {
    location,
    params,
    query,
    navigate,
    navigateTo,
    back,
    forward,
    isActive,
  }
}

/**
 * Hook to get the current location.
 *
 * @returns The current route location
 */
export function useLocation(): RouteLocation {
  const { location } = useRouter()
  return location
}

/**
 * Hook to get route parameters.
 *
 * @returns The current route parameters
 */
export function useParams<T extends Record<string, string> = RouteParams>(): T {
  const { params } = useRouter()
  return params as T
}

/**
 * Hook to get query parameters.
 *
 * @returns The current query parameters
 */
export function useQuery<T extends QueryParams = QueryParams>(): T {
  const { query } = useRouter()
  return query as T
}

/**
 * Hook to get the navigate function.
 *
 * @returns The navigate function
 */
export function useNavigate(): (path: string, options?: NavigateOptions) => void {
  const router = useRouterInstance()
  return useCallback(
    (path: string, options?: NavigateOptions) => router.navigate(path, options),
    [router],
  )
}

/**
 * Hook to check if a path is active.
 *
 * @param path - The path to check
 * @param exact - Whether to match exactly (default: false)
 * @returns Whether the path is active
 */
export function useIsActive(path: string, exact = false): boolean {
  const router = useRouterInstance()

  const getSnapshot = useCallback(() => router.isActive(path, exact), [router, path, exact])

  const subscribe = useCallback((onChange: () => void) => router.subscribe(onChange), [router])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * URL-backed pagination, filters and selected views, through whichever routing bond the
 * app wired: the page, the filters and the view live in the URL only, so a reload, a
 * shared link and Back all show the same list. Built on `resolveListRoute` from
 * `@molecule/app-routing`, so every framework binding returns the same result.
 *
 * A signed-out visit to a view with `requiresAuth` replaces the entry with
 * `options.auth.redirectTo`, carrying `state.returnTo`; until auth is confirmed
 * `canLoad` is `false`.
 *
 * @param options - Filter sources, view paths, pagination and optional auth readiness.
 * @returns The list state (`page`, `offset`, `filters`, `selection`, `canLoad`) and
 * its link builder and navigation actions.
 * @throws {Error} When `pageSize` is not a positive safe integer, or a protected view
 * has no `auth`.
 *
 * @example
 * ```tsx
 * const list = useListRoute({ pageSize: 10, filters: { tag: {} } })
 * const { data } = useQuery(`/articles?limit=10&offset=${list.offset}&tag=${list.filters.tag ?? ''}`)
 * return <a href={list.href({ page: list.page + 1 })}>Next</a>
 * ```
 */
export function useListRoute<Filter extends string = string, Selection extends string = string>(
  options: ListRouteOptions<Filter, Selection> = {},
): ListRouteResult<Filter, Selection> {
  const { location, params, navigate } = useRouter()
  const list = resolveListRoute<Filter, Selection>(
    { location, routeParams: params },
    options,
    navigate,
  )
  const redirect = listRouteRedirect(list, location)
  const redirectTo = redirect?.to
  const returnTo = redirect?.options.state.returnTo
  useEffect(() => {
    if (redirectTo === undefined || returnTo === undefined) return
    navigate(redirectTo, { replace: true, state: { returnTo } })
  }, [navigate, redirectTo, returnTo])
  return list
}

/**
 * Takes a one-time credential (a reset `token`, an OAuth `code`) out of the URL and
 * keeps it in memory, through whichever routing bond the app wired. The parameter is
 * removed with a replace navigation that keeps the path, the hash, the other query
 * values and the location state; the value survives re-renders and later query-only
 * navigation, Back to an entry restores the value consumed there, and a new value
 * arriving on the same mounted route is consumed too.
 *
 * @param name - The query key to consume, for example `token` or `code`.
 * @returns The consumed value (`''` before the parameter was ever present) and a setter
 * (a form clears it after a successful submit).
 *
 * @example
 * ```tsx
 * const [resetToken, setResetToken] = useConsumedSearchParam('token')
 * // The form submits resetToken after the address no longer contains it.
 * ```
 */
export function useConsumedSearchParam(name: string): readonly [string, (value: string) => void] {
  const router = useRouterInstance()
  // Held in state, not useMemo: once the address is clean the consumed value exists only in
  // this object, and React may drop a memoized value. A new router or name starts a new one.
  const [held, setHeld] = useState(() => ({
    router,
    name,
    param: createConsumedSearchParam(router, name),
  }))
  let param = held.param
  if (held.router !== router || held.name !== name) {
    param = createConsumedSearchParam(router, name)
    setHeld({ router, name, param })
  }
  const value = useSyncExternalStore(param.subscribe, param.get, param.get)
  useEffect(() => param.connect(), [param])
  return [value, param.set] as const
}
