/**
 * Next.js App Router provider implementation.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'
import { warn } from '@molecule/app-logger'

import type {
  NavigateOptions,
  NavigationGuard,
  NextParams,
  NextRouterConfig,
  QueryParams,
  RouteChangeListener,
  RouteDefinition,
  RouteLocation,
  RouteMatch,
  RouteParams,
  Router,
} from './types.js'
import { generatePath, matchPath, stringifyQuery } from './utilities.js'

/**
 * Creates a Next.js App Router adapter.
 *
 * @example
 * ```tsx
 * 'use client'
 *
 * import { useRouter, usePathname, useSearchParams, useParams } from 'next/navigation'
 * import { createNextRouter, setRouter } from '`@molecule/app-routing-next`'
 *
 * function RouterProvider({ children }) {
 *   const navigation = useRouter()
 *   const pathname = usePathname()
 *   const searchParams = useSearchParams()
 *   const params = useParams()
 *
 *   const router = useMemo(() => createNextRouter({
 *     navigation,
 *     pathname,
 *     searchParams: Object.fromEntries(searchParams),
 *     params,
 *   }), [navigation, pathname, searchParams, params])
 *
 *   useEffect(() => {
 *     setRouter(router)
 *   }, [router])
 *
 *   return children
 * }
 * ```
 * @param config - Configuration with Next.js's `navigation` (from `useRouter()`), `pathname`, `searchParams`, `params`, and optional `routes`.
 * @returns A molecule `Router` with navigation, guards, query/hash management, and route matching.
 */
export const createNextRouter = (config: NextRouterConfig = {}): Router => {
  const {
    navigation,
    pathname = typeof window !== 'undefined' ? window.location.pathname : '/',
    searchParams = {},
    params = {},
    routes = [],
  } = config

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

  const getSearchString = (): string => {
    const entries = Object.entries(searchParams)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => {
        if (Array.isArray(v)) {
          return v.map((val) => `${encodeURIComponent(k)}=${encodeURIComponent(val)}`).join('&')
        }
        return `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`
      })
    return entries.length ? `?${entries.join('&')}` : ''
  }

  const currentLocation: RouteLocation = {
    pathname,
    search: getSearchString(),
    hash: typeof window !== 'undefined' ? window.location.hash : '',
    key: Math.random().toString(36).slice(2),
  }

  const normalizeParams = (p: NextParams): RouteParams => {
    const result: RouteParams = {}
    for (const [key, value] of Object.entries(p)) {
      result[key] = Array.isArray(value) ? value.join('/') : value
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
    listeners.forEach((listener) => listener(currentLocation, action))
  }

  let redirectDepth = 0
  const MAX_REDIRECTS = 10

  const navigate = async (path: string, options: NavigateOptions = {}): Promise<void> => {
    const { replace = false, preserveQuery, preserveHash } = options

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
      key: Math.random().toString(36).slice(2),
    }

    const guardResult = await runGuards(newLocation, currentLocation)
    if (guardResult === false) return
    if (typeof guardResult === 'string') {
      if (++redirectDepth > MAX_REDIRECTS) {
        redirectDepth = 0
        warn(`[molecule/routing] Max redirects (${MAX_REDIRECTS}) exceeded. Aborting navigation.`)
        return
      }
      await navigate(guardResult, { replace: true })
      return
    }
    if (typeof guardResult === 'object' && 'path' in guardResult) {
      if (++redirectDepth > MAX_REDIRECTS) {
        redirectDepth = 0
        warn(`[molecule/routing] Max redirects (${MAX_REDIRECTS}) exceeded. Aborting navigation.`)
        return
      }
      await navigate(guardResult.path, { replace: guardResult.replace })
      return
    }
    redirectDepth = 0

    if (navigation) {
      if (replace) {
        navigation.replace(fullPath)
      } else {
        navigation.push(fullPath)
      }
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
    getLocation: () => currentLocation,

    getParams<T extends RouteParams = RouteParams>(): T {
      return normalizeParams(params) as T
    },

    getQuery: () => {
      const result: QueryParams = {}
      for (const [key, value] of Object.entries(searchParams)) {
        if (value !== undefined) {
          result[key] = value
        }
      }
      return result
    },

    getQueryParam: (key: string) => {
      const value = searchParams[key]
      return Array.isArray(value) ? value[0] : value
    },

    getHash: () => currentLocation.hash,

    navigate,

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

      navigate(path, options)
    },

    back(): void {
      if (navigation) {
        navigation.back()
      } else if (typeof window !== 'undefined') {
        window.history.back()
      }
    },

    forward(): void {
      if (navigation) {
        navigation.forward()
      } else if (typeof window !== 'undefined') {
        window.history.forward()
      }
    },

    go(delta: number): void {
      if (typeof window !== 'undefined') {
        window.history.go(delta)
      }
    },

    setQuery(query: QueryParams, options?: NavigateOptions): void {
      const path = pathname + stringifyQuery(query) + currentLocation.hash
      navigate(path, options)
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
      const normalizedHash = hash.startsWith('#') ? hash : `#${hash}`
      const path = pathname + currentLocation.search + normalizedHash
      navigate(path, options)
    },

    isActive(path: string, exact?: boolean): boolean {
      const match = matchPath(path, pathname, exact)
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
 * Default Next.js router provider (basic, no hooks). For full functionality, use
 * `createNextRouter` with `useRouter`/`usePathname`/`useSearchParams`/`useParams`.
 */
export const provider = createNextRouter()
