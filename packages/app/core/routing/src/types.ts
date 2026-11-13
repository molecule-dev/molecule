/**
 * Type definitions for client-side routing.
 *
 * @module
 */

/**
 * URL path parameter key-value map extracted from dynamic route segments (e.g. `{ id: '123' }`).
 */
export type RouteParams = Record<string, string>

/**
 * URL query string parameter map (single values or arrays for repeated keys).
 */
export type QueryParams = Record<string, string | string[] | undefined>

/**
 * Current URL decomposed into pathname, search string, hash, navigation state, and unique key.
 */
export interface RouteLocation {
  /**
   * Current pathname.
   */
  pathname: string

  /**
   * Query string (including leading ?).
   */
  search: string

  /**
   * Hash (including leading #).
   */
  hash: string

  /**
   * State data passed with navigation.
   */
  state?: unknown

  /**
   * Unique key for this location.
   */
  key?: string
}

/**
 * Result of matching a URL against a route pattern (path, params, query string).
 */
export interface RouteMatch<Params extends RouteParams = RouteParams> {
  /**
   * Route path pattern.
   */
  path: string

  /**
   * Matched URL pathname.
   */
  pathname: string

  /**
   * Route parameters.
   */
  params: Params

  /**
   * Whether this is an exact match.
   */
  isExact: boolean
}

/**
 * Options for programmatic navigation (replace vs push, carry state, preserve query/hash).
 */
export interface NavigateOptions {
  /**
   * Replace current history entry instead of pushing.
   */
  replace?: boolean

  /**
   * State to pass with navigation.
   */
  state?: unknown

  /**
   * Preserve current query params.
   */
  preserveQuery?: boolean

  /**
   * Preserve current hash.
   */
  preserveHash?: boolean
}

/**
 * Route configuration entry (path pattern, name, auth requirements, roles, children).
 */
export interface RouteDefinition {
  /**
   * Route path pattern.
   */
  path: string

  /**
   * Route name (for named routes).
   */
  name?: string

  /**
   * Whether the route requires exact matching.
   */
  exact?: boolean

  /**
   * Whether the route requires authentication.
   */
  requiresAuth?: boolean

  /**
   * Required roles/permissions.
   */
  roles?: string[]

  /**
   * Route metadata.
   */
  meta?: Record<string, unknown>

  /**
   * Child routes.
   */
  children?: RouteDefinition[]
}

/**
 * Navigation guard result.
 */
export type GuardResult = boolean | string | { path: string; replace?: boolean } | void

/**
 * Navigation guard function invoked before each navigation.
 * Return `false` to cancel, a string/path to redirect, or void to allow.
 *
 * @param to - The target route location being navigated to.
 * @param from - The current route location being navigated away from, or `null` on initial load.
 */
export type NavigationGuard = (
  to: RouteLocation,
  from: RouteLocation | null,
) => GuardResult | Promise<GuardResult>

/**
 * How a navigation moved through the history: a new entry (`push`), the current entry
 * replaced (`replace`), or a move to an existing entry (`pop`: back, forward, `go`).
 */
export type NavigationAction = 'push' | 'replace' | 'pop'

/**
 * Callback invoked on each route change with the new location and the
 * navigation action that triggered it.
 */
export type RouteChangeListener = (location: RouteLocation, action: NavigationAction) => void

/**
 * A native router's history, as {@link createHistoryRouter} needs it. A routing bond
 * implements this over its library (Vue Router, Solid Router, Angular Router, SvelteKit)
 * and gets the whole {@link Router} from `createHistoryRouter`.
 */
export interface RouterHistory {
  /** The current location, read from the native router at the time of the call. */
  location(): RouteLocation
  /**
   * The params of the route the native router matched. Omit it when the native router
   * does not match routes; params then come from the registered route definitions.
   */
  params?(): RouteParams
  /** Adds `path` (pathname, query string and hash) as a new history entry. */
  push(path: string, state?: unknown): void | Promise<void>
  /** Replaces the current history entry with `path`. */
  replace(path: string, state?: unknown): void | Promise<void>
  /** Moves `delta` entries back (negative) or forward (positive). */
  go(delta: number): void
  /**
   * Calls `listener` once after every navigation the native router commits, however it
   * started: a link, the back button, or `push`/`replace` above. Pass the action when the
   * native router reports it; without one, a navigation this router started is reported
   * with its own action and any other as `push`.
   *
   * @returns A function that stops listening.
   */
  listen(listener: (action?: NavigationAction) => void): () => void
  /** Releases what the history holds (event listeners); called by `Router.destroy()`. */
  destroy?(): void
}

/**
 * Client-side router providing navigation, guards, route matching, and history control.
 *
 * All routing providers must implement this interface.
 */
export interface Router {
  /**
   * Returns the current route location (pathname, search, hash, state).
   */
  getLocation(): RouteLocation

  /**
   * Gets the current route params.
   */
  getParams<T extends RouteParams = RouteParams>(): T

  /**
   * Gets the current query params.
   */
  getQuery(): QueryParams

  /**
   * Gets a specific query parameter.
   */
  getQueryParam(key: string): string | undefined

  /**
   * Gets the current hash.
   */
  getHash(): string

  /**
   * Navigates to a path.
   */
  navigate(path: string, options?: NavigateOptions): void

  /**
   * Navigates to a named route.
   */
  navigateTo(
    name: string,
    params?: RouteParams,
    query?: QueryParams,
    options?: NavigateOptions,
  ): void

  /**
   * Goes back in history.
   */
  back(): void

  /**
   * Goes forward in history.
   */
  forward(): void

  /**
   * Goes to a specific point in history.
   */
  go(delta: number): void

  /**
   * Updates the current query params.
   */
  setQuery(params: QueryParams, options?: NavigateOptions): void

  /**
   * Updates a specific query parameter.
   */
  setQueryParam(key: string, value: string | undefined, options?: NavigateOptions): void

  /**
   * Updates the current hash.
   */
  setHash(hash: string, options?: NavigateOptions): void

  /**
   * Checks if a path matches the current location.
   *
   * @returns `true` if the path matches the current route.
   */
  isActive(path: string, exact?: boolean): boolean

  /**
   * Matches a path pattern against a pathname.
   */
  matchPath<Params extends RouteParams = RouteParams>(
    pattern: string,
    pathname: string,
  ): RouteMatch<Params> | null

  /**
   * Generates a URL from a named route.
   */
  generatePath(name: string, params?: RouteParams, query?: QueryParams): string

  /**
   * Subscribes to route changes.
   */
  subscribe(listener: RouteChangeListener): () => void

  /**
   * Adds a navigation guard.
   */
  addGuard(guard: NavigationGuard): () => void

  /**
   * Registers route definitions.
   */
  registerRoutes(routes: RouteDefinition[]): void

  /**
   * Gets all registered routes.
   */
  getRoutes(): RouteDefinition[]

  /**
   * Destroys the router.
   */
  destroy(): void
}

/**
 * Configuration options for creating a router instance.
 */
export interface RouterConfig {
  /**
   * Router mode.
   */
  mode?: 'history' | 'hash' | 'memory'

  /**
   * Base path.
   */
  basePath?: string

  /**
   * Initial routes.
   */
  routes?: RouteDefinition[]
}
