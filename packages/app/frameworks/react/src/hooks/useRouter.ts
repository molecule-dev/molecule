/**
 * React hook for routing.
 *
 * @module
 */

import { useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react'

import { t } from '@molecule/app-i18n'
import type {
  NavigateOptions,
  QueryParams,
  RouteLocation,
  RouteParams,
  Router,
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
