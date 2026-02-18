/**
 * Svelte stores for routing.
 *
 * @module
 */

import { derived, type Readable, readable } from 'svelte/store'

import type {
  NavigateOptions,
  QueryParams,
  RouteLocation,
  RouteParams,
  Router,
} from '@molecule/app-routing'

import { getRouter } from '../context.js'

/**
 * Router stores and actions.
 */
interface RouterStores {
  location: Readable<RouteLocation>
  params: Readable<RouteParams>
  query: Readable<QueryParams>
  pathname: Readable<string>
  navigate: (path: string, options?: NavigateOptions) => void
  navigateTo: (
    name: string,
    routeParams?: RouteParams,
    query?: QueryParams,
    options?: NavigateOptions,
  ) => void
  back: () => void
  forward: () => void
  isActive: (path: string, exact?: boolean) => boolean
}

/**
 * Create router stores from the router in context.
 *
 * @returns Router stores and actions
 *
 * @example
 * ```svelte
 * <script>
 *   import { createRouterStores } from '`@molecule/app-svelte`'
 *
 *   const { location, params, query, navigate, back } = createRouterStores()
 * </script>
 *
 * <nav>
 *   <a href="#" on:click|preventDefault={() => navigate('/home')}>Home</a>
 *   <span>Current: {$location.pathname}</span>
 * </nav>
 * ```
 */
export function createRouterStores(): RouterStores {
  const router = getRouter()

  // Location store
  const location: Readable<RouteLocation> = readable(
    router.getLocation(),
    (set: (value: RouteLocation) => void) => {
      return router.subscribe(() => {
        set(router.getLocation())
      })
    },
  )

  // Params store
  const params: Readable<RouteParams> = readable(
    router.getParams(),
    (set: (value: RouteParams) => void) => {
      return router.subscribe(() => {
        set(router.getParams())
      })
    },
  )

  // Query store
  const query: Readable<QueryParams> = readable(
    router.getQuery(),
    (set: (value: QueryParams) => void) => {
      return router.subscribe(() => {
        set(router.getQuery())
      })
    },
  )

  // Derived stores
  const pathname = derived(location, ($loc: RouteLocation) => $loc.pathname)

  // Actions
  const navigate = (path: string, options?: NavigateOptions): void => {
    router.navigate(path, options)
  }

  const navigateTo = (
    name: string,
    routeParams?: RouteParams,
    query?: QueryParams,
    options?: NavigateOptions,
  ): void => {
    router.navigateTo(name, routeParams, query, options)
  }

  const back = (): void => {
    router.back()
  }

  const forward = (): void => {
    router.forward()
  }

  const isActive = (path: string, exact = false): boolean => {
    return router.isActive(path, exact)
  }

  return {
    location,
    params,
    query,
    pathname,
    navigate,
    navigateTo,
    back,
    forward,
    isActive,
  }
}

/**
 * Create a derived store that checks if a path is active.
 *
 * @param location - A readable location store (from createRouterStores or createRouterStoresFromRouter)
 * @param router - Router instance (for isActive check)
 * @param path - Path to check
 * @param exact - Whether to require exact match (default: false)
 * @returns Readable store of whether the path is active
 *
 * @example
 * ```svelte
 * <script>
 *   import { createRouterStores, createIsActiveStore } from '`@molecule/app-svelte`'
 *   import { getRouter } from '`@molecule/app-svelte`'
 *
 *   const { location } = createRouterStores()
 *   const router = getRouter()
 *   const isHomeActive = createIsActiveStore(location, router, '/home', true)
 * </script>
 *
 * <a class:active={$isHomeActive} href="/home">Home</a>
 * ```
 */
export function createIsActiveStore(
  location: Readable<RouteLocation>,
  router: Router,
  path: string,
  exact = false,
): Readable<boolean> {
  return derived(location, () => router.isActive(path, exact))
}

/**
 * Create router stores from a specific router.
 *
 * @param router - Router instance
 * @returns Router stores and actions
 */
export function createRouterStoresFromRouter(router: Router): RouterStores {
  const location: Readable<RouteLocation> = readable(
    router.getLocation(),
    (set: (value: RouteLocation) => void) => {
      return router.subscribe(() => set(router.getLocation()))
    },
  )

  const params: Readable<RouteParams> = readable(
    router.getParams(),
    (set: (value: RouteParams) => void) => {
      return router.subscribe(() => set(router.getParams()))
    },
  )

  const query: Readable<QueryParams> = readable(
    router.getQuery(),
    (set: (value: QueryParams) => void) => {
      return router.subscribe(() => set(router.getQuery()))
    },
  )

  return {
    location,
    params,
    query,
    pathname: derived(location, ($loc: RouteLocation) => $loc.pathname),
    navigate: (path: string, options?: NavigateOptions) => router.navigate(path, options),
    navigateTo: (name: string, p?: RouteParams, q?: QueryParams, options?: NavigateOptions) =>
      router.navigateTo(name, p, q, options),
    back: () => router.back(),
    forward: () => router.forward(),
    isActive: (path: string, exact = false) => router.isActive(path, exact),
  }
}
