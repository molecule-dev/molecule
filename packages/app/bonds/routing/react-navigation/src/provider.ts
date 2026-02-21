/**
 * React Navigation Router implementation.
 *
 * Implements the abstract Router interface from `@molecule/app-routing`
 * by bridging to React Navigation's imperative API.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'
import type {
  NavigateOptions,
  NavigationGuard,
  QueryParams,
  RouteChangeListener,
  RouteDefinition,
  RouteLocation,
  RouteMatch,
  RouteParams,
  Router,
} from '@molecule/app-routing'

import type { NavigationRef, ReactNavigationConfig } from './types.js'
import {
  generatePath,
  matchPath,
  parseSearchString,
  resolvePathFromScreen,
  resolveScreenFromPath,
  stringifyQuery,
} from './utilities.js'

/**
 * Creates a Router backed by React Navigation.
 *
 * The router translates between URL-based routing (used by molecule's
 * Router interface) and screen-based routing (used by React Navigation)
 * via a linking configuration.
 * @param config - React Navigation configuration including routes, linking, and navigation ref.
 * @returns A Router implementation backed by React Navigation.
 */
export function createReactNavigationRouter(config: ReactNavigationConfig): Router {
  const guards: NavigationGuard[] = []
  const listeners = new Set<RouteChangeListener>()
  const screens: Record<string, string> = config.linking?.screens ?? {}
  const navigationRef: NavigationRef | undefined = config.navigationRef
  let registeredRoutes: RouteDefinition[] = [...(config.routes ?? [])]
  const namedRoutes = new Map<string, RouteDefinition>()

  let unsubscribeStateChange: (() => void) | undefined

  // Index named routes for navigateTo() lookups
  const indexRoutes = (routeList: RouteDefinition[], prefix = ''): void => {
    for (const route of routeList) {
      const fullPath = prefix + route.path
      if (route.name) {
        namedRoutes.set(route.name, { ...route, path: fullPath })
      }
      if (route.children) {
        indexRoutes(route.children, fullPath)
      }
    }
  }
  indexRoutes(registeredRoutes)

  /**
   * Returns the current route location derived from React Navigation state.
   * @returns The current route location.
   */
  function getCurrentLocation(): RouteLocation {
    const currentRoute = navigationRef?.getCurrentRoute()
    if (!currentRoute) {
      return { pathname: '/', search: '', hash: '' }
    }

    const pathname = resolvePathFromScreen(currentRoute.name, currentRoute.params, screens)
    return {
      pathname,
      search: '',
      hash: '',
      state: currentRoute.params,
      key: currentRoute.key,
    }
  }

  /**
   * Notifies all subscribed route change listeners.
   * @param action - The navigation action that triggered the change.
   */
  function notifyListeners(action: 'push' | 'replace' | 'pop'): void {
    const location = getCurrentLocation()
    for (const listener of listeners) {
      listener(location, action)
    }
  }

  /**
   * Subscribes to React Navigation state changes and forwards them to listeners.
   */
  function setupStateListener(): void {
    if (unsubscribeStateChange) unsubscribeStateChange()
    if (navigationRef) {
      unsubscribeStateChange = navigationRef.addListener('state', () => {
        notifyListeners('push')
      })
    }
  }

  /**
   * Runs all registered navigation guards sequentially.
   * @param to - The target route location.
   * @param from - The current route location, or null if no previous location.
   * @returns Whether navigation is allowed to proceed.
   */
  async function runGuards(to: RouteLocation, from: RouteLocation | null): Promise<boolean> {
    for (const guard of guards) {
      const result = await guard(to, from)
      if (result === false) return false
      if (typeof result === 'string') {
        router.navigate(result)
        return false
      }
      if (typeof result === 'object' && result !== null && 'path' in result) {
        router.navigate(result.path, { replace: result.replace })
        return false
      }
    }
    return true
  }

  const router: Router = {
    getLocation: getCurrentLocation,

    getParams<T extends RouteParams = RouteParams>(): T {
      const currentRoute = navigationRef?.getCurrentRoute()
      if (!currentRoute?.params) return {} as T
      const result: RouteParams = {}
      for (const [k, v] of Object.entries(currentRoute.params)) {
        if (v !== undefined) result[k] = String(v)
      }
      return result as T
    },

    getQuery(): QueryParams {
      // React Navigation doesn't natively use query strings,
      // but they may be encoded in the navigation state
      const location = getCurrentLocation()
      return parseSearchString(location.search)
    },

    getQueryParam(key: string): string | undefined {
      const query = router.getQuery()
      const val = query[key]
      if (Array.isArray(val)) return val[0]
      return val
    },

    getHash(): string {
      return getCurrentLocation().hash
    },

    navigate(path: string, options?: NavigateOptions): void {
      if (!navigationRef) {
        throw new Error(
          t(
            'routing.error.noNavigationRef',
            {},
            { defaultValue: 'Navigation ref not set. Ensure MoleculeProvider is mounted.' },
          ),
        )
      }

      const from = getCurrentLocation()
      const to: RouteLocation = {
        pathname: path.split('?')[0].split('#')[0],
        search: path.includes('?') ? `?${path.split('?')[1].split('#')[0]}` : '',
        hash: path.includes('#') ? `#${path.split('#')[1]}` : '',
        state: options?.state,
      }

      void runGuards(to, from).then((allowed) => {
        if (!allowed) return

        const resolved = resolveScreenFromPath(to.pathname, screens)
        if (resolved) {
          if (options?.replace) {
            navigationRef!.dispatch({
              type: 'REPLACE',
              payload: { name: resolved.screen, params: resolved.params },
            })
          } else {
            navigationRef!.navigate(resolved.screen, resolved.params)
          }
        }
      })
    },

    navigateTo(
      name: string,
      params?: RouteParams,
      query?: QueryParams,
      options?: NavigateOptions,
    ): void {
      const route = namedRoutes.get(name)
      if (!route) {
        throw new Error(
          t('routing.error.routeNotFound', { name }, { defaultValue: `Route "${name}" not found` }),
        )
      }

      let path = generatePath(route.path, params)
      if (query) {
        path += stringifyQuery(query)
      }

      router.navigate(path, options)
    },

    back(): void {
      if (navigationRef?.canGoBack()) {
        navigationRef.goBack()
      }
    },

    forward(): void {
      // React Navigation doesn't have forward — no-op
    },

    go(delta: number): void {
      if (delta < 0 && navigationRef?.canGoBack()) {
        navigationRef.goBack()
      }
      // React Navigation doesn't support forward history traversal
    },

    setQuery(params: QueryParams, options?: NavigateOptions): void {
      const location = getCurrentLocation()
      const path = location.pathname + stringifyQuery(params) + location.hash
      router.navigate(path, options)
    },

    setQueryParam(key: string, value: string | undefined, options?: NavigateOptions): void {
      const query = router.getQuery()
      if (value === undefined) {
        delete query[key]
      } else {
        query[key] = value
      }
      router.setQuery(query, options)
    },

    setHash(hash: string, options?: NavigateOptions): void {
      const location = getCurrentLocation()
      const normalizedHash = hash.startsWith('#') ? hash : `#${hash}`
      const path = location.pathname + location.search + normalizedHash
      router.navigate(path, options)
    },

    isActive(path: string, exact?: boolean): boolean {
      const location = getCurrentLocation()
      const match = matchPath(path, location.pathname, exact)
      return match !== null
    },

    matchPath<Params extends RouteParams = RouteParams>(
      pattern: string,
      pathname: string,
    ): RouteMatch<Params> | null {
      return matchPath<Params>(pattern, pathname)
    },

    generatePath(name: string, params?: RouteParams, query?: QueryParams): string {
      const route = namedRoutes.get(name)
      if (!route) {
        throw new Error(
          t('routing.error.routeNotFound', { name }, { defaultValue: `Route "${name}" not found` }),
        )
      }

      let path = generatePath(route.path, params)
      if (query) {
        path += stringifyQuery(query)
      }

      return path
    },

    subscribe(listener: RouteChangeListener): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    addGuard(guard: NavigationGuard): () => void {
      guards.push(guard)
      return () => {
        const index = guards.indexOf(guard)
        if (index >= 0) guards.splice(index, 1)
      }
    },

    registerRoutes(newRoutes: RouteDefinition[]): void {
      registeredRoutes = [...registeredRoutes, ...newRoutes]
      indexRoutes(newRoutes)
    },

    getRoutes(): RouteDefinition[] {
      return registeredRoutes
    },

    destroy(): void {
      if (unsubscribeStateChange) {
        unsubscribeStateChange()
        unsubscribeStateChange = undefined
      }
      listeners.clear()
      guards.length = 0
    },
  }

  if (navigationRef) {
    setupStateListener()
  }

  return router
}
