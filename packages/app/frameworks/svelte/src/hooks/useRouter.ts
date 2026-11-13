/**
 * Svelte hooks for routing, porting React's `useRouter` family.
 *
 * @module
 */

import { onDestroy, onMount } from 'svelte'
import { get, type Readable, writable } from 'svelte/store'

import type {
  ListRouteOptions,
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

import { useRouterInstance } from '../context.js'
import { fieldStore, isReadableStore, liveStore } from './live-store.js'

/** What {@link useRouter} returns. */
export interface UseRouterResult {
  /** The current location. */
  location: Readable<RouteLocation>
  /** The current route's path parameters. */
  params: Readable<Record<string, string>>
  /** The current query parameters. */
  query: Readable<QueryParams>
  /** Navigates to a path. */
  navigate: Router['navigate']
  /** Navigates to a named route. */
  navigateTo: Router['navigateTo']
  /** Goes back one history entry. */
  back: Router['back']
  /** Goes forward one history entry. */
  forward: Router['forward']
  /** Whether a path is active (prefix, or exact with `exact`). */
  isActive: Router['isActive']
}

/**
 * Routing state and navigation, React's `useRouter` in Svelte's idiom: call it
 * during component init under `setMoleculeContext({ router })`.
 *
 * @returns Router state as stores and the navigation methods.
 * @example
 * ```svelte
 * <script>
 *   import { useRouter } from '@molecule/app-svelte'
 *   const { location, navigate } = useRouter()
 * </script>
 *
 * <p>Current path: {$location.pathname}</p>
 * <button onclick={() => navigate('/home')}>Go home</button>
 * ```
 */
export function useRouter(): UseRouterResult {
  const router = useRouterInstance()
  const state = liveStore(
    () => ({
      location: router.getLocation(),
      params: router.getParams(),
      query: router.getQuery(),
    }),
    (notify) => router.subscribe(notify),
  )
  return {
    location: fieldStore(state, 'location'),
    params: fieldStore(state, 'params'),
    query: fieldStore(state, 'query'),
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
 * The current location, React's `useLocation` in Svelte's idiom.
 *
 * @returns A readable store of the current route location.
 */
export function useLocation(): Readable<RouteLocation> {
  const { location } = useRouter()
  return location
}

/**
 * The current route's path parameters, React's `useParams` in Svelte's idiom.
 *
 * @param T - The params record type.
 * @returns A readable store of the route parameters.
 */
export function useParams<T extends Record<string, string> = RouteParams>(): Readable<T> {
  const { params } = useRouter()
  return params as Readable<T>
}

/**
 * The current query parameters, React's `useQuery` in Svelte's idiom.
 *
 * @param T - The query record type.
 * @returns A readable store of the query parameters.
 */
export function useQuery<T extends QueryParams = QueryParams>(): Readable<T> {
  const { query } = useRouter()
  return query as Readable<T>
}

/**
 * The navigate function, React's `useNavigate` in Svelte's idiom.
 *
 * @returns A function that navigates to a path.
 */
export function useNavigate(): (path: string, options?: NavigateOptions) => void {
  const router = useRouterInstance()
  return (path: string, options?: NavigateOptions) => router.navigate(path, options)
}

/**
 * Whether a path is active, React's `useIsActive` in Svelte's idiom: a
 * readable store that re-evaluates on every route change.
 *
 * @param path - The path to check.
 * @param exact - Whether to match exactly (default: false).
 * @returns A readable store of whether the path is active.
 */
export function useIsActive(path: string, exact = false): Readable<boolean> {
  const router = useRouterInstance()
  return liveStore(
    () => router.isActive(path, exact),
    (notify) => router.subscribe(notify),
  )
}

/** What {@link useListRoute} returns: each list field as a readable store, the actions as plain functions. */
export interface UseListRouteResult<
  Filter extends string = string,
  Selection extends string = string,
> {
  /** The current 1-indexed page. */
  page: Readable<number>
  /** The configured items per page. */
  pageSize: Readable<number>
  /** The zero-indexed item offset for an API request. */
  offset: Readable<number>
  /** The current URL filter values, including values supplied by path parameters. */
  filters: Readable<Record<Filter, string | undefined>>
  /** The matching view, or the configured fallback. */
  selection: Readable<Selection | undefined>
  /** The decoded current path parameters, also usable as API-only filters. */
  params: Readable<RouteParams>
  /** False while a protected selection is awaiting auth, signed out, or unavailable. */
  canLoad: Readable<boolean>
  /** Readiness for the current view; a public view always stays ready. */
  status: Readable<ListRouteResult<Filter, Selection>['status']>
  /** The sign-in destination while a signed-out protected view is being redirected. */
  redirectTo: Readable<string | undefined>
  /** Builds a real link target, preserving the pathname, unrelated query values and hash. */
  href: ListRouteResult<Filter, Selection>['href']
  /** Navigates atomically; location state is preserved unless options replace it. */
  navigate: ListRouteResult<Filter, Selection>['navigate']
  /** Changes only the page, retaining the current filters and view. */
  setPage: ListRouteResult<Filter, Selection>['setPage']
  /** Patches URL filters and returns to page one. */
  setFilters: ListRouteResult<Filter, Selection>['setFilters']
  /** Selects a configured view at page one. */
  select: ListRouteResult<Filter, Selection>['select']
}

/** The store {@link useConsumedSearchParam} returns: the current `[value, set]` tuple. */
export type UseConsumedSearchParamStore = Readable<readonly [string, (value: string) => void]>

/**
 * URL-backed pagination, filters and selected views, React's `useListRoute` in
 * Svelte's idiom: the page, the filters and the view live in the URL only, so a
 * reload, a shared link and Back all show the same list. Each list field is a
 * readable store that follows the location, and the actions are plain
 * functions, through whichever routing bond the app wired. Built on
 * `resolveListRoute` from `@molecule/app-routing`, so every framework binding
 * returns the same result.
 *
 * A signed-out visit to a view with `requiresAuth` replaces the entry with
 * `options.auth.redirectTo`, carrying `state.returnTo`; until auth is confirmed
 * `canLoad` is `false`.
 *
 * The options may be a readable store: an auth status moving from `loading` to
 * `unauthenticated` re-resolves the list — and performs the sign-in redirect —
 * on the same component, the way React re-renders `useListRoute`.
 *
 * @param options - Filter sources, view paths, pagination and optional auth readiness (or a store of them).
 * @returns Each list field as a readable store, and its link builder and navigation actions.
 * @throws {Error} When `pageSize` is not a positive safe integer, or a protected view has no `auth`.
 * @example
 * ```svelte
 * <script>
 *   import { useListRoute } from '@molecule/app-svelte'
 *
 *   const { page, offset, href } = useListRoute({ pageSize: 10, filters: { tag: {} } })
 *   // Load items from $offset; the page and filters come from the URL.
 * </script>
 *
 * <a href={href({ page: $page + 1 })}>Next</a>
 * ```
 */
export function useListRoute<Filter extends string = string, Selection extends string = string>(
  options: ListRouteOptions<Filter, Selection> | Readable<ListRouteOptions<Filter, Selection>> = {},
): UseListRouteResult<Filter, Selection> {
  const router = useRouterInstance()
  let currentOptions = isReadableStore(options) ? get(options) : options
  const resolve = (): ListRouteResult<Filter, Selection> =>
    resolveListRoute<Filter, Selection>(
      { location: router.getLocation(), routeParams: router.getParams() },
      currentOptions,
      (path, navigateOptions) => router.navigate(path, navigateOptions),
    )
  let latest = resolve()
  const state = writable(latest)
  // One re-resolve per location (or options) change, then the redirect it asks
  // for: navigating notifies this subscription again, and at the sign-in URL
  // `listRouteRedirect` answers undefined, so the update settles.
  const update = (): void => {
    latest = resolve()
    state.set(latest)
    const redirect = listRouteRedirect(latest, router.getLocation())
    if (redirect) router.navigate(redirect.to, redirect.options)
  }
  const stopRouter = router.subscribe(() => update())
  let stopOptions: (() => void) | null = null
  if (isReadableStore(options)) {
    stopOptions = options.subscribe((next) => {
      if (next === currentOptions) return
      currentOptions = next
      update()
    })
  }
  // React's redirect effect also runs once mounted, for a list that opens
  // directly on a signed-out protected view.
  onMount(update)
  onDestroy(() => {
    stopRouter()
    stopOptions?.()
  })
  return {
    page: fieldStore(state, 'page'),
    pageSize: fieldStore(state, 'pageSize'),
    offset: fieldStore(state, 'offset'),
    filters: fieldStore(state, 'filters'),
    selection: fieldStore(state, 'selection'),
    params: fieldStore(state, 'params'),
    canLoad: fieldStore(state, 'canLoad'),
    status: fieldStore(state, 'status'),
    redirectTo: fieldStore(state, 'redirectTo'),
    href: (change) => latest.href(change),
    navigate: (change, navigateOptions) => latest.navigate(change, navigateOptions),
    setPage: (page, navigateOptions) => latest.setPage(page, navigateOptions),
    setFilters: (filters, navigateOptions) => latest.setFilters(filters, navigateOptions),
    select: (selection, navigateOptions) => latest.select(selection, navigateOptions),
  }
}

/**
 * Takes a one-time credential (a reset `token`, an OAuth `code`) out of the URL
 * and keeps it in memory, React's `useConsumedSearchParam` in Svelte's idiom: a
 * readable store of the `[value, set]` tuple, through whichever routing bond
 * the app wired. The parameter is removed with a replace navigation that keeps
 * the path, the hash, the other query values and the location state; the value
 * survives re-renders and later query-only navigation, Back to an entry
 * restores the value consumed there, and a new value arriving on the same
 * mounted route is consumed too.
 *
 * @param name - The query key to consume, for example `token` or `code`.
 * @returns A readable store of the consumed value (`''` before the parameter
 * was ever present) and a setter (a form clears it after a successful submit).
 * @example
 * ```svelte
 * <script>
 *   import { useConsumedSearchParam } from '@molecule/app-svelte'
 *
 *   const token = useConsumedSearchParam('token')
 *   // The form submits $token[0] after the address no longer contains it.
 * </script>
 * ```
 */
export function useConsumedSearchParam(name: string): UseConsumedSearchParamStore {
  const router = useRouterInstance()
  const param = createConsumedSearchParam(router, name)
  const tuple = writable<readonly [string, (value: string) => void]>([param.get(), param.set])
  const unsubscribe = param.subscribe((value) => tuple.set([value, param.set]))
  onDestroy(unsubscribe)
  // connect() consumes what the URL holds now and follows the router; its
  // return stops both. It runs once mounted, as React's
  // `useEffect(() => param.connect(), [param])` does, so a server render never
  // navigates.
  onMount(() => param.connect())
  return tuple
}
