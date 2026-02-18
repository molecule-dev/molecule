/**
 * Vue Router provider implementation.
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
  VueRouterConfig,
} from './types.js'
import {
  generatePath,
  matchPath,
  normalizeParams,
  parseVueQuery,
  stringifyQuery,
  toVueQuery,
} from './utilities.js'

/**
 * Creates a Vue Router adapter that implements the molecule Router interface.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useRouter, useRoute } from 'vue-router'
 * import { createVueRouter } from '`@molecule/app-routing-vue-router`'
 * import { setRouter } from '`@molecule/app-routing`'
 * import { watch, computed } from 'vue'
 *
 * const vueRouter = useRouter()
 * const route = useRoute()
 *
 * const moleculeRouter = computed(() => createVueRouter({
 *   router: vueRouter,
 *   route,
 * }))
 *
 * watch(moleculeRouter, (router) => {
 *   setRouter(router)
 * }, { immediate: true })
 * </script>
 * ```
 * @param config - Configuration with Vue Router's `router` instance, current `route`, and optional `routes`.
 * @returns A molecule `Router` with navigation, guards, query/hash management, and route matching.
 */
export const createVueRouter = (config: VueRouterConfig = {}): Router => {
  const { router: vueRouter, route, routes = [] } = config

  let registeredRoutes = [...routes]
  const listeners = new Set<RouteChangeListener>()
  const guards: NavigationGuard[] = []
  const namedRoutes = new Map<string, RouteDefinition>()

  // Index named routes
  const indexRoutes = (routeList: RouteDefinition[], prefix = ''): void => {
    for (const routeDef of routeList) {
      const fullPath = prefix + routeDef.path
      if (routeDef.name) {
        namedRoutes.set(routeDef.name, { ...routeDef, path: fullPath })
      }
      if (routeDef.children) {
        indexRoutes(routeDef.children, fullPath)
      }
    }
  }
  indexRoutes(routes)

  // Build current location
  const getCurrentLocation = (): RouteLocation => {
    if (route) {
      return {
        pathname: route.path,
        search: route.fullPath.includes('?')
          ? `?${route.fullPath.split('?')[1].split('#')[0]}`
          : '',
        hash: route.hash,
        state: route.meta,
        key: String(route.name ?? route.path),
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

    if (vueRouter) {
      if (replace) {
        await vueRouter.replace(fullPath)
      } else {
        await vueRouter.push(fullPath)
      }
    } else if (typeof window !== 'undefined') {
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
      if (route) {
        return normalizeParams(route.params as Record<string, string | string[]>) as T
      }
      return {} as T
    },

    getQuery: () => {
      if (route) {
        return parseVueQuery(route.query)
      }
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const result: QueryParams = {}
        params.forEach((value, key) => {
          result[key] = value
        })
        return result
      }
      return {}
    },

    getQueryParam: (key: string) => {
      if (route) {
        const value = route.query[key]
        if (Array.isArray(value)) {
          return value[0] ?? undefined
        }
        return value ?? undefined
      }
      return undefined
    },

    getHash: () => getCurrentLocation().hash,

    navigate: doNavigate,

    navigateTo(
      name: string,
      routeParams?: RouteParams,
      query?: QueryParams,
      options?: NavigateOptions,
    ): void {
      // Try molecule named routes first
      const routeDef = namedRoutes.get(name)
      if (routeDef) {
        let path = generatePath(routeDef.path, routeParams)
        if (query) {
          path += stringifyQuery(query)
        }
        doNavigate(path, options)
        return
      }

      // Fall back to Vue Router named routes
      if (vueRouter) {
        const routeLocation = {
          name,
          params: routeParams,
          query: query ? toVueQuery(query) : undefined,
          replace: options?.replace,
        }

        if (options?.replace) {
          vueRouter.replace(routeLocation)
        } else {
          vueRouter.push(routeLocation)
        }
        return
      }

      throw new Error(
        t('routing.error.routeNotFound', { name }, { defaultValue: `Route "${name}" not found` }),
      )
    },

    back(): void {
      if (vueRouter) {
        vueRouter.back()
      } else if (typeof window !== 'undefined') {
        window.history.back()
      }
    },

    forward(): void {
      if (vueRouter) {
        vueRouter.forward()
      } else if (typeof window !== 'undefined') {
        window.history.forward()
      }
    },

    go(delta: number): void {
      if (vueRouter) {
        vueRouter.go(delta)
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
      const routeDef = namedRoutes.get(name)
      if (routeDef) {
        let path = generatePath(routeDef.path, routeParams)
        if (query) {
          path += stringifyQuery(query)
        }
        return path
      }

      // Fall back to Vue Router
      if (vueRouter) {
        const resolved = vueRouter.resolve({
          name,
          params: routeParams,
          query: query ? toVueQuery(query) : undefined,
        })
        return resolved.fullPath
      }

      throw new Error(
        t('routing.error.routeNotFound', { name }, { defaultValue: `Route "${name}" not found` }),
      )
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
 * Default Vue Router provider (basic, no hooks). For full functionality, use
 * `createVueRouter` with `useRouter`/`useRoute`.
 */
export const provider = createVueRouter()
