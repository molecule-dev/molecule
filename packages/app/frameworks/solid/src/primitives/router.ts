/**
 * Solid.js primitives for routing.
 *
 * @module
 */

import { type Accessor, createEffect, createSignal, onCleanup } from 'solid-js'

import type {
  NavigateOptions,
  QueryParams,
  RouteLocation,
  RouteParams,
  Router,
} from '@molecule/app-routing'

import { getRouter } from '../context.js'
import type { RouterPrimitives } from '../types.js'

/**
 * Create router primitives for navigation state and actions.
 *
 * @returns Router primitives object
 *
 * @example
 * ```tsx
 * import { createRouter } from '`@molecule/app-solid`'
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
 * Get current route location as accessor.
 *
 * @returns Accessor for current location
 *
 * @example
 * ```tsx
 * function Breadcrumb() {
 *   const location = useLocation()
 *   return <span>{location().pathname}</span>
 * }
 * ```
 */
export function useLocation(): Accessor<RouteLocation> {
  const { location } = createRouter()
  return location
}

/**
 * Get current route params as accessor.
 *
 * @returns Accessor for route params
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const params = useParams()
 *   return <div>User ID: {params().userId}</div>
 * }
 * ```
 */
export function useParams(): Accessor<RouteParams> {
  const { params } = createRouter()
  return params
}

/**
 * Get current query params as accessor.
 *
 * @returns Accessor for query params
 *
 * @example
 * ```tsx
 * function SearchResults() {
 *   const query = useQuery()
 *   return <div>Search: {query().q}</div>
 * }
 * ```
 */
export function useQuery(): Accessor<QueryParams> {
  const { query } = createRouter()
  return query
}

/**
 * Get navigate function.
 *
 * @returns Navigate function
 *
 * @example
 * ```tsx
 * function LoginButton() {
 *   const navigate = useNavigate()
 *
 *   const handleLogin = async () => {
 *     await login()
 *     navigate('/dashboard')
 *   }
 *
 *   return <button onClick={handleLogin}>Login</button>
 * }
 * ```
 */
export function useNavigate(): (path: string, options?: NavigateOptions) => void {
  const { navigate } = createRouter()
  return navigate
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
