/**
 * `createHistoryRouter`: the whole molecule `Router` built on a native router's history.
 *
 * A routing bond supplies a {@link RouterHistory} — how to read the native router's
 * location, move through its history and hear its navigations — and gets every other
 * `Router` method (query and hash helpers, guards, named routes, matching, subscriptions)
 * from this one implementation. Every bond built this way behaves the same.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'

import type {
  GuardResult,
  NavigateOptions,
  NavigationAction,
  NavigationGuard,
  QueryParams,
  RouteChangeListener,
  RouteDefinition,
  RouteLocation,
  RouteMatch,
  RouteParams,
  Router,
  RouterHistory,
} from './types.js'
import { generatePath, matchPath, parseQuery, stringifyQuery } from './utilities.js'

/** Options for {@link createHistoryRouter}. */
export interface HistoryRouterOptions {
  /** Route definitions for named routes ({@link Router.navigateTo}) and route params. */
  routes?: RouteDefinition[]
}

/** A route definition with its parents' paths prefixed (`/settings` + `/profile`). */
interface FlatRoute {
  definition: RouteDefinition
  path: string
}

const flatten = (routes: RouteDefinition[], prefix = ''): FlatRoute[] =>
  routes.flatMap((definition) => {
    const path = joinPaths(prefix, definition.path)
    return [{ definition, path }, ...flatten(definition.children ?? [], path)]
  })

const joinPaths = (prefix: string, path: string): string =>
  `${prefix}/${path}`.replace(/\/{2,}/g, '/').replace(/(.)\/$/, '$1')

/**
 * Splits a path such as `/a?b=1#c` into a location.
 *
 * @param path - Pathname with optional query string and hash.
 * @param state - Navigation state to carry.
 * @returns The location (without a key).
 */
export const parseLocation = (path: string, state?: unknown): RouteLocation => {
  const hashIndex = path.indexOf('#')
  const beforeHash = hashIndex === -1 ? path : path.slice(0, hashIndex)
  const hash = hashIndex === -1 ? '' : path.slice(hashIndex)
  const queryIndex = beforeHash.indexOf('?')
  const pathname = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex)
  const search = queryIndex === -1 ? '' : beforeHash.slice(queryIndex)
  return {
    pathname: pathname || '/',
    search: search === '?' ? '' : search,
    hash: hash === '#' ? '' : hash,
    state,
  }
}

/**
 * Joins a location back into `pathname + search + hash`.
 *
 * @param location - The location.
 * @returns The path.
 */
export const formatLocation = (
  location: Pick<RouteLocation, 'pathname' | 'search' | 'hash'>,
): string => location.pathname + location.search + location.hash

const routeNotFound = (name: string): Error =>
  new Error(
    t('routing.error.routeNotFound', { name }, { defaultValue: 'Route "{{name}}" not found' }),
  )

/**
 * Runs the guards in order. Stays synchronous while every guard answers synchronously,
 * so a router whose history commits synchronously also navigates synchronously.
 *
 * @param guards - The guards.
 * @param to - Target location.
 * @param from - Current location.
 * @returns The first result that is not `true`/`undefined`, or `true`.
 */
const runGuards = (
  guards: readonly NavigationGuard[],
  to: RouteLocation,
  from: RouteLocation,
): GuardResult | Promise<GuardResult> => {
  for (let i = 0; i < guards.length; i++) {
    const result = guards[i](to, from)
    if (result instanceof Promise) {
      return result.then(async (settled) =>
        settled !== undefined && settled !== true
          ? settled
          : await runGuards(guards.slice(i + 1), to, from),
      )
    }
    if (result !== undefined && result !== true) return result
  }
  return true
}

/**
 * Builds a molecule `Router` on a native router's history.
 *
 * Subscribers hear every navigation the history reports through
 * {@link RouterHistory.listen} — links, the back button, and this router's own
 * `navigate` — exactly once each. Guards run for navigations made through this router
 * (a redirect they return takes the stopped navigation's place, as a push or a replace
 * like it); the native router's own guards govern the rest.
 *
 * @param history - The native router's history.
 * @param options - Route definitions.
 * @returns The router.
 *
 * @example
 * ```ts
 * import { createHistoryRouter, setRouter } from '@molecule/app-routing'
 *
 * setRouter(createHistoryRouter(myNativeHistory, { routes: [{ path: '/users/:id', name: 'user' }] }))
 * ```
 */
export const createHistoryRouter = (
  history: RouterHistory,
  options: HistoryRouterOptions = {},
): Router => {
  let routes: RouteDefinition[] = [...(options.routes ?? [])]
  let flatRoutes = flatten(routes)
  const listeners = new Set<RouteChangeListener>()
  const guards: NavigationGuard[] = []
  /** Navigations this router started, so a history that cannot tell push from replace is answered. */
  let pending: { path: string; action: NavigationAction }[] = []
  let stopListening: (() => void) | null = null

  const onNavigation = (action?: NavigationAction): void => {
    const location = history.location()
    const index = pending.findIndex((entry) => entry.path === formatLocation(location))
    const resolved = action ?? (index === -1 ? 'push' : pending[index].action)
    pending = index === -1 ? [] : pending.slice(index + 1)
    for (const listener of [...listeners]) listener(location, resolved)
  }

  const commit = (path: string, replace: boolean, state: unknown): void | Promise<void> => {
    if (stopListening) pending.push({ path, action: replace ? 'replace' : 'push' })
    return replace ? history.replace(path, state) : history.push(path, state)
  }

  const resolveTarget = (path: string, navigateOptions: NavigateOptions): string => {
    const current = history.location()
    const target = parseLocation(path)
    return formatLocation({
      pathname: target.pathname,
      search: target.search || (navigateOptions.preserveQuery ? current.search : ''),
      hash: target.hash || (navigateOptions.preserveHash ? current.hash : ''),
    })
  }

  const navigate = (path: string, navigateOptions: NavigateOptions = {}): void | Promise<void> => {
    const { replace = false, state } = navigateOptions
    const fullPath = resolveTarget(path, navigateOptions)
    const decide = (result: GuardResult): void | Promise<void> => {
      if (result === false) return
      // A redirect takes the place of the navigation it stopped, push or replace alike.
      if (typeof result === 'string') return navigate(result, { replace })
      if (typeof result === 'object' && result !== null)
        return navigate(result.path, { replace: result.replace ?? replace })
      return commit(fullPath, replace, state)
    }
    if (guards.length === 0) return commit(fullPath, replace, state)
    const result = runGuards(guards, parseLocation(fullPath, state), history.location())
    return result instanceof Promise ? result.then(decide) : decide(result)
  }

  const namedPath = (name: string, params?: RouteParams, query?: QueryParams): string => {
    const route = flatRoutes.find((entry) => entry.definition.name === name)
    if (!route) throw routeNotFound(name)
    return generatePath(route.path, params) + (query ? stringifyQuery(query) : '')
  }

  const router: Router = {
    getLocation: () => history.location(),

    getParams<T extends RouteParams = RouteParams>(): T {
      const native = history.params?.()
      if (native) return native as T
      const { pathname } = history.location()
      for (const route of flatRoutes) {
        const match = matchPath<T>(route.path, pathname, true)
        if (match) return match.params
      }
      return {} as T
    },

    getQuery: () => parseQuery(history.location().search),

    getQueryParam: (key: string) => {
      const value = parseQuery(history.location().search)[key]
      return Array.isArray(value) ? value[0] : value
    },

    getHash: () => history.location().hash,

    navigate,

    navigateTo(name, params, query, navigateOptions) {
      return navigate(namedPath(name, params, query), navigateOptions)
    },

    back: () => history.go(-1),

    forward: () => history.go(1),

    go: (delta: number) => history.go(delta),

    setQuery(query, navigateOptions) {
      const { pathname, hash } = history.location()
      return navigate(pathname + stringifyQuery(query) + hash, navigateOptions)
    },

    setQueryParam(key, value, navigateOptions) {
      const query = parseQuery(history.location().search)
      if (value === undefined) delete query[key]
      else query[key] = value
      return router.setQuery(query, navigateOptions)
    },

    setHash(hash, navigateOptions) {
      const { pathname, search } = history.location()
      const normalized = hash === '' || hash.startsWith('#') ? hash : `#${hash}`
      return navigate(pathname + search + normalized, navigateOptions)
    },

    isActive: (path: string, exact?: boolean) =>
      matchPath(path, history.location().pathname, exact) !== null,

    matchPath: <Params extends RouteParams = RouteParams>(
      pattern: string,
      pathname: string,
    ): RouteMatch<Params> | null => matchPath<Params>(pattern, pathname),

    generatePath: namedPath,

    subscribe(listener: RouteChangeListener): () => void {
      listeners.add(listener)
      if (!stopListening) stopListening = history.listen(onNavigation)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0 && stopListening) {
          stopListening()
          stopListening = null
        }
      }
    },

    addGuard(guard: NavigationGuard): () => void {
      guards.push(guard)
      return () => {
        const index = guards.indexOf(guard)
        if (index !== -1) guards.splice(index, 1)
      }
    },

    registerRoutes(newRoutes: RouteDefinition[]): void {
      routes = [...routes, ...newRoutes]
      flatRoutes = flatten(routes)
    },

    getRoutes: () => routes,

    destroy(): void {
      listeners.clear()
      guards.length = 0
      pending = []
      stopListening?.()
      stopListening = null
      history.destroy?.()
    },
  }

  return router
}
