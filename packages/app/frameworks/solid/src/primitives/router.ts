/**
 * Solid.js primitives for routing.
 *
 * @module
 */

import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  useContext,
} from 'solid-js'

import { t } from '@molecule/app-i18n'
import type {
  ListRouteOptions,
  ListRouteRedirect,
  ListRouteResult,
  NavigateOptions,
  QueryParams,
  RouteLocation,
  RouteParams,
  Router,
} from '@molecule/app-routing'
import {
  createConsumedSearchParam,
  listRouteRedirect,
  resolveListRoute,
} from '@molecule/app-routing'

import { getRouter, RouterContext } from '../context.js'
import type { RouterPrimitives } from '../types.js'
import { useSyncExternalStore } from './external-store.js'
import { liveStateTuple } from './reactive-tuple.js'

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
 * What {@link useListRoute} returns: each list-state field as an accessor, and
 * the link builder and navigation actions as plain functions (React's
 * `ListRouteResult` under this binding's value shape).
 */
export type UseListRouteResult<
  Filter extends string = string,
  Selection extends string = string,
> = {
  /** Current 1-indexed page. */
  readonly page: Accessor<number>
  /** Configured items per page. */
  readonly pageSize: Accessor<number>
  /** Zero-indexed item offset for an API request. */
  readonly offset: Accessor<number>
  /** Current URL filter values, including values supplied by path parameters. */
  readonly filters: Accessor<Record<Filter, string | undefined>>
  /** Matching view, or the configured fallback. */
  readonly selection: Accessor<Selection | undefined>
  /** Decoded current path parameters, also usable as API-only filters. */
  readonly params: Accessor<RouteParams>
  /** False while a protected selection is awaiting auth, signed out, or unavailable. */
  readonly canLoad: Accessor<boolean>
  /** Readiness for the current view. A public view always stays ready. */
  readonly status: Accessor<ListRouteResult<Filter, Selection>['status']>
  /** Sign-in destination while a signed-out protected view is being redirected. */
  readonly redirectTo: Accessor<string | undefined>
  /** Build a real link target, preserving the current pathname, unrelated query values and hash. */
  readonly href: ListRouteResult<Filter, Selection>['href']
  /** Navigate atomically. Location state is preserved unless options explicitly replace it. */
  readonly navigate: ListRouteResult<Filter, Selection>['navigate']
  /** Change only the page, retaining the current filters and view. */
  readonly setPage: ListRouteResult<Filter, Selection>['setPage']
  /** Patch URL filters and return to page one. */
  readonly setFilters: ListRouteResult<Filter, Selection>['setFilters']
  /** Select a configured view at page one, preserving current route parameters. */
  readonly select: ListRouteResult<Filter, Selection>['select']
}

/**
 * URL-backed pagination, filters and selected views, under React's hook name:
 * the page, the filters and the view live in the URL only, so a reload, a
 * shared link and Back all show the same list. Built on `resolveListRoute`
 * from `@molecule/app-routing`, so every framework binding returns the same
 * result.
 *
 * A signed-out visit to a view with `requiresAuth` replaces the entry with
 * `options.auth.redirectTo`, carrying `state.returnTo`; until auth is
 * confirmed `canLoad()` is `false`.
 *
 * The options may be an accessor: a new auth status re-resolves the list on
 * the same component, the way React re-renders `useListRoute`.
 *
 * @param options - List options (or an accessor of them): filter sources, view
 *   paths, pagination and optional auth readiness.
 * @returns Each list-state field as an accessor, and the link builder and
 *   navigation actions as plain functions.
 * @throws {Error} When no `MoleculeProvider` above configures `router`; when
 *   `pageSize` is not a positive safe integer, or a protected view has no
 *   `auth`.
 * @example
 * ```tsx
 * import { useListRoute, useTranslation } from '@molecule/app-solid'
 *
 * function Articles() {
 *   const { t } = useTranslation()
 *   const list = useListRoute(() => ({ pageSize: 10, filters: { tag: {} } }))
 *   // Load items from list.offset(); the page and filters come from the URL.
 *   return <a href={list.href({ page: list.page() + 1 })}>{t('list.nextPage')}</a>
 * }
 * ```
 */
export function useListRoute<Filter extends string = string, Selection extends string = string>(
  options: ListRouteOptions<Filter, Selection> | Accessor<ListRouteOptions<Filter, Selection>> = {},
): UseListRouteResult<Filter, Selection> {
  const { location, params, navigate } = useRouter()

  const readOptions = (): ListRouteOptions<Filter, Selection> =>
    typeof options === 'function' ? options() : options

  // The list re-resolves on each location or options change. The memo computes
  // eagerly, so a bad `pageSize` or a protected selection without `auth`
  // throws from the hook call, the way React's render does.
  const list = createMemo(() =>
    resolveListRoute<Filter, Selection>(
      { location: location(), routeParams: params() },
      readOptions(),
      navigate,
    ),
  )

  // The redirect target, deduplicated so a location change that computes the
  // same target re-runs nothing (React's effect keyed on `redirectTo` and
  // `returnTo`).
  const redirect = createMemo((previous: ListRouteRedirect | undefined) => {
    const next = listRouteRedirect(list(), location())
    return next !== undefined &&
      previous !== undefined &&
      next.to === previous.to &&
      next.options.state.returnTo === previous.options.state.returnTo
      ? previous
      : next
  })

  createEffect(() => {
    const target = redirect()
    if (!target) return
    navigate(target.to, target.options)
  })

  return {
    page: () => list().page,
    pageSize: () => list().pageSize,
    offset: () => list().offset,
    filters: () => list().filters,
    selection: () => list().selection,
    params: () => list().params,
    canLoad: () => list().canLoad,
    status: () => list().status,
    redirectTo: () => list().redirectTo,
    href: (change) => list().href(change),
    navigate: (change, navigateOptions) => list().navigate(change, navigateOptions),
    setPage: (page, navigateOptions) => list().setPage(page, navigateOptions),
    setFilters: (filters, navigateOptions) => list().setFilters(filters, navigateOptions),
    select: (selection, navigateOptions) => list().select(selection, navigateOptions),
  }
}

/**
 * Takes a one-time credential (a reset `token`, an OAuth `code`) out of the
 * URL and keeps it in memory, under React's hook name, through whichever
 * routing bond the app wired. The parameter is removed with a replace
 * navigation that keeps the path, the hash, the other query values and the
 * location state; the value survives later query-only navigation, Back to an
 * entry restores the value consumed there, and a new value arriving on the
 * same mounted route is consumed too.
 *
 * @param name - The query key to consume, for example `token` or `code`.
 * @returns The tuple the binding's tuples use: the consumed value at index 0 as
 *   a live getter (`''` before the parameter was ever present) and the setter at
 *   index 1 (a form clears it after a successful submit).
 * @throws {Error} When no `MoleculeProvider` above configures `router`.
 * @example
 * ```tsx
 * import { useConsumedSearchParam } from '@molecule/app-solid'
 *
 * function ResetForm() {
 *   const token = useConsumedSearchParam('token')
 *   // Read token[0] where it is used (it is live there; a destructured copy is
 *   // not). The form submits it after the address no longer contains it.
 *   return <form onSubmit={() => token[1]('')}>…</form>
 * }
 * ```
 */
export function useConsumedSearchParam(name: string): [string, (value: string) => void] {
  const router = useRouterInstance()
  const param = createConsumedSearchParam(router, name)
  const value = useSyncExternalStore(param.subscribe, param.get)
  // `connect` follows the router from mount; its return stops it on unmount.
  let disconnect: (() => void) | null = null
  onMount(() => {
    disconnect = param.connect()
  })
  onCleanup(() => {
    disconnect?.()
    disconnect = null
  })
  return liveStateTuple(value, [param.set])
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
