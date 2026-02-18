/**
 * React Router v7 provider implementation.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'

import type {
  NavigateOptions,
  NavigationGuard,
  QueryParams,
  ReactRouterConfig,
  RouteChangeListener,
  RouteDefinition,
  RouteLocation,
  RouteMatch,
  RouteParams,
  Router,
} from './types.js'
import { generatePath, matchPath, parseSearchParams, stringifyQuery } from './utilities.js'

/**
 * Creates a React Router adapter that implements the molecule Router interface.
 *
 * @example
 * ```tsx
 * import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
 * import { createReactRouter, setRouter } from '`@molecule/app-routing-react-router`'
 * import { useEffect, useMemo } from 'react'
 *
 * function RouterProvider({ children }) {
 *   const navigate = useNavigate()
 *   const location = useLocation()
 *   const params = useParams()
 *   const [searchParams] = useSearchParams()
 *
 *   const router = useMemo(() => createReactRouter({
 *     navigate,
 *     location,
 *     params,
 *   }), [navigate, location, params])
 *
 *   useEffect(() => {
 *     setRouter(router)
 *   }, [router])
 *
 *   return children
 * }
 * ```
 * @param config - Configuration with React Router's `navigate` function, `location`, `params`, and optional `routes`.
 * @returns A molecule `Router` with navigation, guards, query/hash management, and route matching.
 */
export const createReactRouter = (config: ReactRouterConfig = {}): Router => {
  const { navigate: navigateFn, location: locationObj, params = {}, routes = [] } = config

  let registeredRoutes = [...routes]
  const listeners = new Set<RouteChangeListener>()
  const guards: NavigationGuard[] = []
  const namedRoutes = new Map<string, RouteDefinition>()

  // Index named routes
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
  indexRoutes(routes)

  // Build current location
  const getCurrentLocation = (): RouteLocation => {
    if (locationObj) {
      return {
        pathname: locationObj.pathname,
        search: locationObj.search,
        hash: locationObj.hash,
        state: locationObj.state,
        key: locationObj.key,
      }
    }

    if (typeof window !== 'undefined') {
      return {
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        key: Math.random().toString(36).slice(2),
      }
    }

    return {
      pathname: '/',
      search: '',
      hash: '',
      key: Math.random().toString(36).slice(2),
    }
  }

  const normalizeParams = (p: Record<string, string | undefined>): RouteParams => {
    const result: RouteParams = {}
    for (const [key, value] of Object.entries(p)) {
      if (value !== undefined) {
        result[key] = value
      }
    }
    return result
  }

  const runGuards = async (
    to: RouteLocation,
    from: RouteLocation | null,
  ): Promise<boolean | string | { path: string; replace?: boolean }> => {
    for (const guard of guards) {
      const result = await guard(to, from)
      if (result !== undefined && result !== true) {
        return result
      }
    }
    return true
  }

  const notify = (action: 'push' | 'replace' | 'pop'): void => {
    const location = getCurrentLocation()
    listeners.forEach((listener) => listener(location, action))
  }

  const doNavigate = async (path: string, options: NavigateOptions = {}): Promise<void> => {
    const { replace = false, preserveQuery, preserveHash, state } = options
    const currentLocation = getCurrentLocation()

    let fullPath = path
    if (preserveQuery && currentLocation.search) {
      fullPath += currentLocation.search
    }
    if (preserveHash && currentLocation.hash) {
      fullPath += currentLocation.hash
    }

    const newLocation: RouteLocation = {
      pathname: fullPath.split('?')[0].split('#')[0],
      search: fullPath.includes('?') ? `?${fullPath.split('?')[1].split('#')[0]}` : '',
      hash: fullPath.includes('#') ? `#${fullPath.split('#')[1]}` : '',
      state,
      key: Math.random().toString(36).slice(2),
    }

    const guardResult = await runGuards(newLocation, currentLocation)
    if (guardResult === false) return
    if (typeof guardResult === 'string') {
      doNavigate(guardResult, { replace: true })
      return
    }
    if (typeof guardResult === 'object' && 'path' in guardResult) {
      doNavigate(guardResult.path, { replace: guardResult.replace })
      return
    }

    if (navigateFn) {
      navigateFn(fullPath, { replace, state })
    } else if (typeof window !== 'undefined') {
      // Fallback to window.location
      if (replace) {
        window.location.replace(fullPath)
      } else {
        window.location.href = fullPath
      }
    }

    notify(replace ? 'replace' : 'push')
  }

  const router: Router = {
    getLocation: getCurrentLocation,

    getParams<T extends RouteParams = RouteParams>(): T {
      return normalizeParams(params) as T
    },

    getQuery: () => {
      const location = getCurrentLocation()
      const searchParams = new URLSearchParams(location.search)
      return parseSearchParams(searchParams)
    },

    getQueryParam: (key: string) => {
      const location = getCurrentLocation()
      const searchParams = new URLSearchParams(location.search)
      return searchParams.get(key) ?? undefined
    },

    getHash: () => getCurrentLocation().hash,

    navigate: doNavigate,

    navigateTo(
      name: string,
      routeParams?: RouteParams,
      query?: QueryParams,
      options?: NavigateOptions,
    ): void {
      const route = namedRoutes.get(name)
      if (!route) {
        throw new Error(
          t('routing.error.routeNotFound', { name }, { defaultValue: `Route "${name}" not found` }),
        )
      }

      let path = generatePath(route.path, routeParams)
      if (query) {
        path += stringifyQuery(query)
      }

      doNavigate(path, options)
    },

    back(): void {
      if (navigateFn) {
        navigateFn(-1)
      } else if (typeof window !== 'undefined') {
        window.history.back()
      }
    },

    forward(): void {
      if (navigateFn) {
        navigateFn(1)
      } else if (typeof window !== 'undefined') {
        window.history.forward()
      }
    },

    go(delta: number): void {
      if (navigateFn) {
        navigateFn(delta)
      } else if (typeof window !== 'undefined') {
        window.history.go(delta)
      }
    },

    setQuery(query: QueryParams, options?: NavigateOptions): void {
      const location = getCurrentLocation()
      const path = location.pathname + stringifyQuery(query) + location.hash
      doNavigate(path, options)
    },

    setQueryParam(key: string, value: string | undefined, options?: NavigateOptions): void {
      const query = this.getQuery()
      if (value === undefined) {
        delete query[key]
      } else {
        query[key] = value
      }
      this.setQuery(query, options)
    },

    setHash(hash: string, options?: NavigateOptions): void {
      const location = getCurrentLocation()
      const normalizedHash = hash.startsWith('#') ? hash : `#${hash}`
      const path = location.pathname + location.search + normalizedHash
      doNavigate(path, options)
    },

    isActive(path: string, exact?: boolean): boolean {
      const location = getCurrentLocation()
      const match = matchPath(path, location.pathname, exact)
      return match !== null
    },

    matchPath<Params extends RouteParams = RouteParams>(
      pattern: string,
      pathToMatch: string,
    ): RouteMatch<Params> | null {
      return matchPath(pattern, pathToMatch)
    },

    generatePath(name: string, routeParams?: RouteParams, query?: QueryParams): string {
      const route = namedRoutes.get(name)
      if (!route) {
        throw new Error(
          t('routing.error.routeNotFound', { name }, { defaultValue: `Route "${name}" not found` }),
        )
      }

      let path = generatePath(route.path, routeParams)
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
        if (index !== -1) {
          guards.splice(index, 1)
        }
      }
    },

    registerRoutes(newRoutes: RouteDefinition[]): void {
      registeredRoutes = [...registeredRoutes, ...newRoutes]
      indexRoutes(newRoutes)
    },

    getRoutes: () => registeredRoutes,

    destroy(): void {
      listeners.clear()
      guards.length = 0
    },
  }

  return router
}

/**
 * Default React Router provider (basic, no hooks). For full functionality, use
 * `createReactRouter` with `useNavigate`/`useLocation`/`useParams`.
 */
export const provider = createReactRouter()
