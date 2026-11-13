/**
 * Solid.js primitives for routing.
 *
 * @module
 */

import { type Accessor, createEffect, createSignal, onCleanup, useContext } from 'solid-js'

import { t } from '@molecule/app-i18n'
import type {
  NavigateOptions,
  QueryParams,
  RouteLocation,
  RouteParams,
  Router,
} from '@molecule/app-routing'

import { getRouter, RouterContext } from '../context.js'
import type { RouterPrimitives } from '../types.js'

/**
 * The router from the nearest `MoleculeProvider` (`config.router`), under
 * React's hook name.
 *
 * @returns The router instance.
 * @throws {Error} When no `MoleculeProvider` above configures `router`.
 */
export function useRouterInstance(): Router {
  const router = useContext(RouterContext)
  if (!router) {
    throw new Error(
      t('solid.error.useRouterOutsideProvider', undefined, {
        defaultValue: 'useRouterInstance must be used within a RouterProvider',
      }),
    )
  }
  return router
}

/**
 * Routing state and actions, under React's hook name.
 *
 * @returns Location, params and query as accessors; the navigation actions.
 * @throws {Error} When no `MoleculeProvider` above configures `router`.
 * @example
 * ```tsx
 * const { location, params, navigate, back } = useRouter()
 * <span>Current path: {location().pathname}</span>
 * ```
 */
export function useRouter(): RouterPrimitives {
  const router = useRouterInstance()

  const [location, setLocation] = createSignal<RouteLocation>(router.getLocation())
  const [params, setParams] = createSignal<RouteParams>(router.getParams())
  const [query, setQuery] = createSignal<QueryParams>(router.getQuery())

  const unsubscribe = router.subscribe((newLocation: RouteLocation) => {
    setLocation(newLocation)
    setParams(router.getParams())
    setQuery(router.getQuery())
  })
  onCleanup(unsubscribe)

  return {
    location,
    params,
    query,
    navigate: (path: string, options?: NavigateOptions) => router.navigate(path, options),
    navigateTo: (
      name: string,
      params?: RouteParams,
      query?: QueryParams,
      options?: NavigateOptions,
    ) => router.navigateTo(name, params, query, options),
    back: () => router.back(),
    forward: () => router.forward(),
    isActive: (path: string, exact?: boolean) => router.isActive(path, exact),
  }
}

/**
 * The current location, under React's hook name.
 *
 * @returns Accessor for the current route location.
 * @throws {Error} When no `MoleculeProvider` above configures `router`.
 */
export function useLocation(): Accessor<RouteLocation> {
  const { location } = useRouter()
  return location
}

/**
 * The current route's path parameters, under React's hook name.
 *
 * @returns Accessor for the route params.
 * @throws {Error} When no `MoleculeProvider` above configures `router`.
 */
export function useParams<T extends Record<string, string> = RouteParams>(): Accessor<T> {
  const { params } = useRouter()
  return params as Accessor<T>
}

/**
 * The parsed query parameters, under React's hook name.
 *
 * @returns Accessor for the query params.
 * @throws {Error} When no `MoleculeProvider` above configures `router`.
 */
export function useQuery<T extends QueryParams = QueryParams>(): Accessor<T> {
  const { query } = useRouter()
  return query as Accessor<T>
}

/**
 * A function that navigates, under React's hook name. It does not subscribe
 * to route changes: navigation needs the instance, not the location.
 *
 * @returns The navigate function.
 * @throws {Error} When no `MoleculeProvider` above configures `router`.
 */
export function useNavigate(): (path: string, options?: NavigateOptions) => void {
  const router = useRouterInstance()
  return (path: string, options?: NavigateOptions) => router.navigate(path, options)
}

/**
 * Whether a path matches the current route, under React's hook name.
 *
 * @param path - The path to check.
 * @param exact - Whether to match exactly (default false).
 * @returns Accessor for whether the path is active.
 * @throws {Error} When no `MoleculeProvider` above configures `router`.
 */
export function useIsActive(path: string, exact = false): Accessor<boolean> {
  const router = useRouterInstance()
  const [active, setActive] = createSignal<boolean>(router.isActive(path, exact))

  const unsubscribe = router.subscribe(() => {
    setActive(router.isActive(path, exact))
  })
  onCleanup(unsubscribe)

  return active
}

/**
 * Create router primitives for navigation state and actions.
 *
 * @returns Router primitives object
 *
 * @example
 * ```tsx
 * import { createRouter } from '@molecule/app-solid'
 *
 * function Navigation() {
 *   const { location, navigate, isActive } = createRouter()
 *
 *   return (
 *     <nav>
 *       <a
 *         href="/home"
 *         class={isActive('/home') ? 'active' : ''}
 *         onClick={(e) => {
 *           e.preventDefault()
 *           navigate('/home')
 *         }}
 *       >
 *         Home
 *       </a>
 *       <span>Current: {location().pathname}</span>
 *     </nav>
 *   )
 * }
 * ```
 */
export function createRouter(): RouterPrimitives {
  const router = getRouter()

  const [location, setLocation] = createSignal<RouteLocation>(router.getLocation())
  const [params, setParams] = createSignal<RouteParams>(router.getParams())
  const [query, setQuery] = createSignal<QueryParams>(router.getQuery())

  // Subscribe to route changes
  createEffect(() => {
    const unsubscribe = router.subscribe((newLocation: RouteLocation) => {
      setLocation(newLocation)
      setParams(router.getParams())
      setQuery(router.getQuery())
    })

    onCleanup(unsubscribe)
  })

  return {
    location,
    params,
    query,
    navigate: router.navigate.bind(router),
    navigateTo: router.navigateTo.bind(router),
    back: router.back.bind(router),
    forward: router.forward.bind(router),
    isActive: router.isActive.bind(router),
  }
}

/**
 * Create a match accessor for a path pattern.
 *
 * @param pattern - Path pattern to match
 * @returns Accessor indicating if current path matches
 *
 * @example
 * ```tsx
 * function NavLink(props: { href: string; children: JSX.Element }) {
 *   const isActive = useMatch(props.href)
 *   return <a class={isActive() ? 'active' : ''} href={props.href}>{props.children}</a>
 * }
 * ```
 */
export function useMatch(pattern: string): Accessor<boolean> {
  const { isActive } = createRouter()
  const [matches, setMatches] = createSignal(isActive(pattern))

  createEffect(() => {
    const router = getRouter()
    const unsubscribe = router.subscribe(() => {
      setMatches(isActive(pattern))
    })

    onCleanup(unsubscribe)
  })

  return matches
}

/**
 * Create a reactive boolean accessor that tracks whether a given path is active.
 *
 * Unlike `useMatch` which only accepts a static pattern, this factory returns
 * a signal that re-evaluates on every route change and supports the `exact`
 * parameter from the router's `isActive` method.
 *
 * @param path - Path to check against the current location
 * @param exact - Whether to require an exact match (default: false)
 * @returns Accessor<boolean> that is true when the path is active
 *
 * @example
 * ```tsx
 * function SideNav() {
 *   const dashboardActive = createIsActive('/dashboard')
 *   const settingsExact = createIsActive('/settings', true)
 *
 *   return (
 *     <nav>
 *       <a class={dashboardActive() ? 'active' : ''} href="/dashboard">Dashboard</a>
 *       <a class={settingsExact() ? 'active' : ''} href="/settings">Settings</a>
 *     </nav>
 *   )
 * }
 * ```
 */
export function createIsActive(path: string, exact?: boolean): Accessor<boolean> {
  const router = getRouter()
  const [active, setActive] = createSignal(router.isActive(path, exact))

  createEffect(() => {
    const unsubscribe = router.subscribe(() => {
      setActive(router.isActive(path, exact))
    })

    onCleanup(unsubscribe)
  })

  return active
}

/**
 * Create router helpers from context.
 *
 * @returns Router helper functions
 */

/**
 * Creates a router helpers.
 * @returns The created result.
 */
export function createRouterHelpers(): {
  navigate: (path: string, options?: NavigateOptions) => void
  navigateTo: (
    name: string,
    params?: RouteParams,
    query?: QueryParams,
    options?: NavigateOptions,
  ) => void
  back: () => void
  forward: () => void
  getLocation: () => RouteLocation
  getParams: () => RouteParams
  getQuery: () => QueryParams
  isActive: (path: string) => boolean
} {
  const router = getRouter()

  return {
    navigate: (path: string, options?: NavigateOptions) => router.navigate(path, options),
    navigateTo: (
      name: string,
      params?: RouteParams,
      query?: QueryParams,
      options?: NavigateOptions,
    ) => router.navigateTo(name, params, query, options),
    back: () => router.back(),
    forward: () => router.forward(),
    getLocation: () => router.getLocation(),
    getParams: () => router.getParams(),
    getQuery: () => router.getQuery(),
    isActive: (path: string) => router.isActive(path),
  }
}

/**
 * Create router primitives from a specific router.
 *
 * @param router - Router instance
 * @returns Router primitives
 */
export function createRouterFromInstance(router: Router): RouterPrimitives {
  const [location, setLocation] = createSignal<RouteLocation>(router.getLocation())
  const [params, setParams] = createSignal<RouteParams>(router.getParams())
  const [query, setQuery] = createSignal<QueryParams>(router.getQuery())

  createEffect(() => {
    const unsubscribe = router.subscribe((newLocation: RouteLocation) => {
      setLocation(newLocation)
      setParams(router.getParams())
      setQuery(router.getQuery())
    })

    onCleanup(unsubscribe)
  })

  return {
    location,
    params,
    query,
    navigate: router.navigate.bind(router),
    navigateTo: router.navigateTo.bind(router),
    back: router.back.bind(router),
    forward: router.forward.bind(router),
    isActive: router.isActive.bind(router),
  }
}
