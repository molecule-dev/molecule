/**
 * Router creation and management.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'
import { getLogger } from '@molecule/app-logger'

import type {
  GuardResult,
  NavigateOptions,
  NavigationGuard,
  QueryParams,
  RouteChangeListener,
  RouteDefinition,
  RouteLocation,
  RouteMatch,
  RouteParams,
  Router,
  RouterConfig,
} from './types.js'
import { generatePath, matchPath, parseQuery, stringifyQuery } from './utilities.js'

/**
 * Creates a browser history-based router using the History API
 * (or hash mode). Supports navigation guards, named routes,
 * and route change subscriptions.
 *
 * @param config - Router configuration (mode, basePath, initial routes).
 * @returns A `Router` instance bound to the browser history.
 */
export const createBrowserRouter = (config: RouterConfig = {}): Router => {
  const logger = getLogger('routing')
  const { mode = 'history', basePath = '', routes = [] } = config

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

  const getLocation = (): RouteLocation => {
    if (mode === 'hash') {
      const hash = window.location.hash.slice(1) || '/'
      const [pathname, search = ''] = hash.split('?')
      return {
        pathname: pathname || '/',
        search: search ? `?${search}` : '',
        hash: '',
        key: Math.random().toString(36).slice(2),
      }
    }

    return {
      pathname: window.location.pathname.replace(basePath, '') || '/',
      search: window.location.search,
      hash: window.location.hash,
      state: window.history.state,
      key: Math.random().toString(36).slice(2),
    }
  }

  let currentLocation = getLocation()

  const runGuards = async (to: RouteLocation, from: RouteLocation | null): Promise<GuardResult> => {
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

  const navigate = async (path: string, options: NavigateOptions = {}): Promise<void> => {
    logger.debug('Navigating', path)
    const { replace = false, state, preserveQuery, preserveHash } = options

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
      navigate(guardResult, { replace: true })
      return
    }
    if (typeof guardResult === 'object' && 'path' in guardResult) {
      navigate(guardResult.path, { replace: guardResult.replace })
      return
    }

    currentLocation = newLocation

    if (mode === 'hash') {
      const hashPath = newLocation.pathname + newLocation.search
      if (replace) {
        window.location.replace(`#${hashPath}`)
      } else {
        window.location.hash = hashPath
      }
    } else {
      const url = basePath + fullPath
      if (replace) {
        window.history.replaceState(state, '', url)
      } else {
        window.history.pushState(state, '', url)
      }
    }

    notify(replace ? 'replace' : 'push')
  }

  // Listen for popstate
  const handlePopState = (): void => {
    currentLocation = getLocation()
    notify('pop')
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', handlePopState)
    if (mode === 'hash') {
      window.addEventListener('hashchange', handlePopState)
    }
  }

  const router: Router = {
    getLocation: () => currentLocation,

    getParams<T extends RouteParams = RouteParams>(): T {
      for (const route of registeredRoutes) {
        const match = matchPath<T>(route.path, currentLocation.pathname, route.exact)
        if (match) return match.params
      }
      return {} as T
    },

    getQuery: () => parseQuery(currentLocation.search),

    getQueryParam: (key: string) => {
      const query = parseQuery(currentLocation.search)
      const value = query[key]
      return Array.isArray(value) ? value[0] : value
    },

    getHash: () => currentLocation.hash,

    navigate,

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

      navigate(path, options)
    },

    back: () => window.history.back(),

    forward: () => window.history.forward(),

    go: (delta: number) => window.history.go(delta),

    setQuery(params: QueryParams, options?: NavigateOptions): void {
      const path = currentLocation.pathname + stringifyQuery(params) + currentLocation.hash
      navigate(path, options)
    },

    setQueryParam(key: string, value: string | undefined, options?: NavigateOptions): void {
      const query = parseQuery(currentLocation.search)
      if (value === undefined) {
        delete query[key]
      } else {
        query[key] = value
      }
      this.setQuery(query, options)
    },

    setHash(hash: string, options?: NavigateOptions): void {
      const normalizedHash = hash.startsWith('#') ? hash : `#${hash}`
      const path = currentLocation.pathname + currentLocation.search + normalizedHash
      navigate(path, options)
    },

    isActive(path: string, exact?: boolean): boolean {
      const match = matchPath(path, currentLocation.pathname, exact)
      return match !== null
    },

    matchPath<Params extends RouteParams = RouteParams>(
      pattern: string,
      pathname: string,
    ): RouteMatch<Params> | null {
      return matchPath(pattern, pathname)
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
      if (typeof window !== 'undefined') {
        window.removeEventListener('popstate', handlePopState)
        if (mode === 'hash') {
          window.removeEventListener('hashchange', handlePopState)
        }
      }
      listeners.clear()
      guards.length = 0
    },
  }

  return router
}

/**
 * Creates an in-memory router for testing and SSR environments.
 * Maintains a synthetic history stack without touching browser APIs.
 *
 * @param config - Router configuration with optional `initialEntries` for the history stack.
 * @returns A `Router` instance backed by an in-memory history.
 */
export const createMemoryRouter = (
  config: RouterConfig & { initialEntries?: string[] } = {},
): Router => {
  const { routes = [], initialEntries = ['/'] } = config

  const history: RouteLocation[] = initialEntries.map((entry) => ({
    pathname: entry.split('?')[0].split('#')[0],
    search: entry.includes('?') ? `?${entry.split('?')[1].split('#')[0]}` : '',
    hash: entry.includes('#') ? `#${entry.split('#')[1]}` : '',
    key: Math.random().toString(36).slice(2),
  }))

  let currentIndex = history.length - 1
  let registeredRoutes = [...routes]
  const listeners = new Set<RouteChangeListener>()
  const guards: NavigationGuard[] = []
  const namedRoutes = new Map<string, RouteDefinition>()

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

  const notify = (action: 'push' | 'replace' | 'pop'): void => {
    listeners.forEach((listener) => listener(history[currentIndex], action))
  }

  const router: Router = {
    getLocation: () => history[currentIndex],

    getParams<T extends RouteParams = RouteParams>(): T {
      const location = history[currentIndex]
      for (const route of registeredRoutes) {
        const match = matchPath<T>(route.path, location.pathname, route.exact)
        if (match) return match.params
      }
      return {} as T
    },

    getQuery: () => parseQuery(history[currentIndex].search),

    getQueryParam: (key: string) => {
      const query = parseQuery(history[currentIndex].search)
      const value = query[key]
      return Array.isArray(value) ? value[0] : value
    },

    getHash: () => history[currentIndex].hash,

    navigate(path: string, options: NavigateOptions = {}): void {
      const newLocation: RouteLocation = {
        pathname: path.split('?')[0].split('#')[0],
        search: path.includes('?') ? `?${path.split('?')[1].split('#')[0]}` : '',
        hash: path.includes('#') ? `#${path.split('#')[1]}` : '',
        state: options.state,
        key: Math.random().toString(36).slice(2),
      }

      if (options.replace) {
        history[currentIndex] = newLocation
        notify('replace')
      } else {
        history.splice(currentIndex + 1)
        history.push(newLocation)
        currentIndex++
        notify('push')
      }
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

      this.navigate(path, options)
    },

    back(): void {
      if (currentIndex > 0) {
        currentIndex--
        notify('pop')
      }
    },

    forward(): void {
      if (currentIndex < history.length - 1) {
        currentIndex++
        notify('pop')
      }
    },

    go(delta: number): void {
      const newIndex = currentIndex + delta
      if (newIndex >= 0 && newIndex < history.length) {
        currentIndex = newIndex
        notify('pop')
      }
    },

    setQuery(params: QueryParams, options?: NavigateOptions): void {
      const location = history[currentIndex]
      const path = location.pathname + stringifyQuery(params) + location.hash
      this.navigate(path, options)
    },

    setQueryParam(key: string, value: string | undefined, options?: NavigateOptions): void {
      const query = parseQuery(history[currentIndex].search)
      if (value === undefined) {
        delete query[key]
      } else {
        query[key] = value
      }
      this.setQuery(query, options)
    },

    setHash(hash: string, options?: NavigateOptions): void {
      const location = history[currentIndex]
      const normalizedHash = hash.startsWith('#') ? hash : `#${hash}`
      const path = location.pathname + location.search + normalizedHash
      this.navigate(path, options)
    },

    isActive(path: string, exact?: boolean): boolean {
      const match = matchPath(path, history[currentIndex].pathname, exact)
      return match !== null
    },

    matchPath<Params extends RouteParams = RouteParams>(
      pattern: string,
      pathname: string,
    ): RouteMatch<Params> | null {
      return matchPath(pattern, pathname)
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
