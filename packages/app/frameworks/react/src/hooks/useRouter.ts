/**
 * React hook for routing.
 *
 * @module
 */

import { useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'

import { t } from '@molecule/app-i18n'
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
  resolveListRoute,
} from '@molecule/app-routing'

import { RouterContext } from '../contexts.js'
import type { UseRouterResult } from '../types.js'

/**
 * Hook to access the router from context.
 *
 * @returns The router from context
 * @throws {Error} Error if used outside of RouterProvider
 */
export function useRouterInstance(): Router {
  const router = useContext(RouterContext)
  if (!router) {
    throw new Error(
      t('react.error.useRouterOutsideProvider', undefined, {
        defaultValue: 'useRouterInstance must be used within a RouterProvider',
      }),
    )
  }
  return router
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

  const [location, setLocation] = useState<RouteLocation>(() => router.getLocation())
  const [params, setParams] = useState<Record<string, string>>(() => router.getParams())
  const [query, setQuery] = useState<QueryParams>(() => router.getQuery())

  useEffect(() => {
    const unsubscribe = router.subscribe(() => {
      setLocation(router.getLocation())
      setParams(router.getParams())
      setQuery(router.getQuery())
    })
    return unsubscribe
  }, [router])

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
  const param = useMemo(() => createConsumedSearchParam(router, name), [router, name])
  const value = useSyncExternalStore(param.subscribe, param.get, param.get)
  useEffect(() => param.connect(), [param])
  return [value, param.set] as const
}
