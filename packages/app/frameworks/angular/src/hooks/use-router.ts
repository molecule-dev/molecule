/**
 * Angular functions for routing, mirroring `useRouter`, `useRouterInstance`,
 * `useLocation`, `useParams`, `useQuery`, `useNavigate`, `useIsActive`,
 * `useListRoute` and `useConsumedSearchParam` from `@molecule/app-react`.
 *
 * @module
 */

import {
  afterNextRender,
  computed,
  DestroyRef,
  effect,
  inject,
  isSignal,
  type Signal,
  signal,
} from '@angular/core'

import type {
  ListRouteChange,
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

import { injectProvider } from '../inject.js'
import { ROUTER } from '../tokens.js'

/**
 * The router registered by `provideMolecule({ router })` or `provideRouter`.
 * Call it in an injection context.
 *
 * @returns The router instance.
 * @throws {Error} When no router is registered.
 */
export function useRouterInstance(): Router {
  return injectProvider(
    ROUTER,
    'useRouterOutsideProvider',
    'useRouterInstance must be used within a RouterProvider',
  )
}

/** One subscription over the router, shared by every field of one hook call. */
interface RouterSubscription {
  readonly location: Signal<RouteLocation>
  readonly params: Signal<RouteParams>
  readonly query: Signal<QueryParams>
}

/**
 * Subscribes to the router once and mirrors location, params and query into
 * signals.
 *
 * @param router - The router to follow.
 * @returns The three location signals.
 */
function followRouter(router: Router): RouterSubscription {
  const location = signal<RouteLocation>(router.getLocation())
  const params = signal<RouteParams>(router.getParams())
  const query = signal<QueryParams>(router.getQuery())
  const stop = router.subscribe(() => {
    location.set(router.getLocation())
    params.set(router.getParams())
    query.set(router.getQuery())
  })
  inject(DestroyRef).onDestroy(stop)
  return {
    location: location.asReadonly(),
    params: params.asReadonly(),
    query: query.asReadonly(),
  }
}

/**
 * What {@link useRouter} returns.
 */
export interface UseRouterResult {
  /** The current route location. */
  readonly location: Signal<RouteLocation>
  /** The current route's path parameters. */
  readonly params: Signal<RouteParams>
  /** The current query parameters. */
  readonly query: Signal<QueryParams>
  /** Navigates to a path. */
  navigate: (path: string, options?: NavigateOptions) => void
  /** Navigates to a named route. */
  navigateTo: (
    name: string,
    params?: RouteParams,
    query?: QueryParams,
    options?: NavigateOptions,
  ) => void
  /** Goes back one history entry. */
  back: () => void
  /** Goes forward one history entry. */
  forward: () => void
  /** Whether a path matches the current route. */
  isActive: (path: string, exact?: boolean) => boolean
}

/**
 * Routing state and actions. Call it in an injection context (a component
 * field initializer or constructor).
 *
 * @returns The location, params and query as signals, and the navigation actions.
 */
export function useRouter(): UseRouterResult {
  const router = useRouterInstance()
  const { location, params, query } = followRouter(router)

  const navigate = (path: string, options?: NavigateOptions): void => {
    router.navigate(path, options)
  }

  const navigateTo = (
    name: string,
    routeParams?: RouteParams,
    query?: QueryParams,
    options?: NavigateOptions,
  ): void => {
    router.navigateTo(name, routeParams, query, options)
  }

  const back = (): void => {
    router.back()
  }
  const forward = (): void => {
    router.forward()
  }
  const isActive = (path: string, exact?: boolean): boolean => router.isActive(path, exact)

  return { location, params, query, navigate, navigateTo, back, forward, isActive }
}

/**
 * The current location alone. Call it in an injection context.
 *
 * @returns A signal of the current route location.
 */
export function useLocation(): Signal<RouteLocation> {
  return followRouter(useRouterInstance()).location
}

/**
 * The current path parameters alone. Call it in an injection context.
 *
 * @returns A signal of the current path parameters.
 */
export function useParams<T extends Record<string, string> = RouteParams>(): Signal<T> {
  return followRouter(useRouterInstance()).params as Signal<T>
}

/**
 * The current query parameters alone. Call it in an injection context.
 *
 * @returns A signal of the current query parameters.
 */
export function useQuery<T extends QueryParams = QueryParams>(): Signal<T> {
  return followRouter(useRouterInstance()).query as Signal<T>
}

/**
 * A navigate function alone. Call it in an injection context.
 *
 * @returns The navigate function.
 */
export function useNavigate(): (path: string, options?: NavigateOptions) => void {
  const router = useRouterInstance()
  return (path: string, options?: NavigateOptions): void => {
    router.navigate(path, options)
  }
}

/**
 * Whether a path is active, re-evaluated on every route change. Call it in an
 * injection context.
 *
 * @param path - The path to check.
 * @param exact - Whether to match exactly (default: `false`).
 * @returns A signal of whether the path is active.
 */
export function useIsActive(path: string, exact = false): Signal<boolean> {
  const router = useRouterInstance()
  const active = signal<boolean>(router.isActive(path, exact))
  const stop = router.subscribe(() => active.set(router.isActive(path, exact)))
  inject(DestroyRef).onDestroy(stop)
  return active.asReadonly()
}

/**
 * What {@link useListRoute} returns: each list state field as a signal (the
 * same fields React's result carries as plain values) and the list's link
 * builder and navigation actions.
 *
 * @template Filter - The filter names.
 * @template Selection - The selection names.
 */
export interface UseListRouteResult<
  Filter extends string = string,
  Selection extends string = string,
> {
  /** The current 1-indexed page (malformed and non-positive URL values read as page one). */
  readonly page: Signal<number>
  /** The configured items per page. */
  readonly pageSize: Signal<number>
  /** The zero-indexed item offset for an API request. */
  readonly offset: Signal<number>
  /** The current URL filter values, including values supplied by path parameters. */
  readonly filters: Signal<Record<Filter, string | undefined>>
  /** The matching view, or the configured fallback. */
  readonly selection: Signal<Selection | undefined>
  /** The decoded current path parameters, also usable as API-only filters. */
  readonly params: Signal<RouteParams>
  /** Whether the current view may load; a protected view waits for auth. */
  readonly canLoad: Signal<boolean>
  /** Readiness for the current view; a public view always stays ready. */
  readonly status: Signal<ListRouteResult<Filter, Selection>['status']>
  /** The sign-in destination while a signed-out protected view is being redirected. */
  readonly redirectTo: Signal<string | undefined>
  /**
   * Builds a real link target, preserving the current pathname, unrelated query
   * values and hash.
   *
   * @param change - The page, filter, selection and path-parameter changes.
   * @returns The link target for the change.
   */
  readonly href: (change?: ListRouteChange<Filter, Selection>) => string
  /**
   * Navigates atomically; location state is preserved unless options replace it.
   *
   * @param change - The page, filter, selection and path-parameter changes.
   * @param options - Navigation options.
   */
  readonly navigate: (change: ListRouteChange<Filter, Selection>, options?: NavigateOptions) => void
  /**
   * Changes only the page, retaining the current filters and view.
   *
   * @param page - The target page, starting at one.
   * @param options - Navigation options.
   */
  readonly setPage: (page: number, options?: NavigateOptions) => void
  /**
   * Patches URL filters and returns to page one.
   *
   * @param filters - The filter values to write (`undefined` removes one).
   * @param options - Navigation options.
   */
  readonly setFilters: (
    filters: Partial<Record<Filter, string | undefined>>,
    options?: NavigateOptions,
  ) => void
  /**
   * Selects a configured view at page one, preserving current route parameters.
   *
   * @param selection - The view to select.
   * @param options - Navigation options.
   */
  readonly select: (selection: Selection, options?: NavigateOptions) => void
}

/**
 * URL-backed pagination, filters and selected views, through whichever routing
 * bond the app wired: the page, the filters and the view live in the URL only,
 * so a reload, a shared link and Back all show the same list. Built on
 * `resolveListRoute` from `@molecule/app-routing`, so every framework binding
 * returns the same result. Call it in an injection context (a component field
 * initializer or constructor).
 *
 * The options may be a signal: an auth status going from `loading` to
 * `unauthenticated` reaches the list on the same component, the way React
 * re-renders `useListRoute` with new options.
 *
 * A signed-out visit to a view with `requiresAuth` replaces the entry with
 * `options.auth.redirectTo`, carrying `state.returnTo`; until auth is confirmed
 * `canLoad` is `false`.
 *
 * @param options - Filter sources, view paths, pagination and optional auth
 *   readiness (or a signal of them).
 * @returns The list state (`page`, `offset`, `filters`, `selection`, `canLoad`)
 *   as signals, and the list's link builder and navigation actions.
 * @throws {Error} When `pageSize` is not a positive safe integer, or a protected
 *   view has no `auth`.
 *
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-articles',
 *   template: `
 *     <a [href]="list.href({ page: list.page() + 1 })">{{ i18n.t('list.nextPage') }}</a>
 *   `,
 * })
 * export class ArticlesComponent {
 *   readonly i18n = useTranslation()
 *   // Load items from list.offset(); the page and filters come from the URL.
 *   readonly list = useListRoute({ pageSize: 10, filters: { tag: {} } })
 * }
 * ```
 */
export function useListRoute<Filter extends string = string, Selection extends string = string>(
  options: ListRouteOptions<Filter, Selection> | Signal<ListRouteOptions<Filter, Selection>> = {},
): UseListRouteResult<Filter, Selection> {
  const { location, params, navigate } = useRouter()
  // The options may be a signal; a plain object never changes on this component.
  const readOptions = (): ListRouteOptions<Filter, Selection> =>
    isSignal(options) ? options() : options
  // Re-resolved from the current location alone, exactly as React re-renders:
  // a navigation (or an options change) recomputes every field.
  const list = computed(() =>
    resolveListRoute<Filter, Selection>(
      { location: location(), routeParams: params() },
      readOptions(),
      navigate,
    ),
  )
  // Resolve once at the call site: an invalid pageSize or a protected selection
  // without auth throws here, the way React's render throws (a lazy computed
  // would defer the throw to the first template read).
  list()
  // React performs the redirect after the render that reported it; this effect
  // runs it at the same point, and re-runs while the redirect target moves.
  effect(() => {
    const redirect = listRouteRedirect(list(), location())
    if (redirect === undefined) return
    navigate(redirect.to, redirect.options)
  })
  return {
    page: computed(() => list().page),
    pageSize: computed(() => list().pageSize),
    offset: computed(() => list().offset),
    filters: computed(() => list().filters),
    selection: computed(() => list().selection),
    params: computed(() => list().params),
    canLoad: computed(() => list().canLoad),
    status: computed(() => list().status),
    redirectTo: computed(() => list().redirectTo),
    href: (change) => list().href(change),
    navigate: (change, navOptions) => list().navigate(change, navOptions),
    setPage: (page, navOptions) => list().setPage(page, navOptions),
    setFilters: (filters, navOptions) => list().setFilters(filters, navOptions),
    select: (selection, navOptions) => list().select(selection, navOptions),
  }
}

/**
 * Takes a one-time credential (a reset `token`, an OAuth `code`) out of the URL
 * and keeps it in memory, through whichever routing bond the app wired. The
 * parameter is removed with a replace navigation that keeps the path, the hash,
 * the other query values and the location state; the value survives the
 * component's lifetime, and Back to an entry restores the value consumed there.
 * Call it in an injection context (a component field initializer or
 * constructor).
 *
 * @param name - The query key to consume, for example `token` or `code`.
 * @returns The consumed value (`''` before the parameter was ever present) and
 *   a setter (a form clears it after a successful submit).
 *
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-reset',
 *   template: `<input [placeholder]="i18n.t('auth.resetPassword.token')" />`,
 * })
 * export class ResetComponent {
 *   readonly i18n = useTranslation()
 *   readonly token = useConsumedSearchParam('token')
 *   submit(password: string): void {
 *     // token[0] holds the value after the address no longer contains it;
 *     // token[1]('') clears it after a successful submit.
 *   }
 * }
 * ```
 */
export function useConsumedSearchParam(name: string): readonly [string, (value: string) => void] {
  const router = useRouterInstance()
  const param = createConsumedSearchParam(router, name)
  // The tuple is the mounted result for this component's whole lifetime and its
  // state member is updated in place, exactly like `usePromise`/`useAsyncState`
  // (see use-async.ts): React re-renders a new value into the same tuple, this
  // port writes the new value into the same tuple's member.
  const tuple: [string, (value: string) => void] = [param.get(), (value) => param.set(value)]
  const stopFollowing = param.subscribe((value) => {
    tuple[0] = value
  })
  inject(DestroyRef).onDestroy(stopFollowing)
  // Like React's effect, the parameter is consumed once the component has
  // rendered (and never during server rendering).
  let disconnect: (() => void) | null = null
  afterNextRender(() => {
    disconnect = param.connect()
  })
  inject(DestroyRef).onDestroy(() => {
    disconnect?.()
    disconnect = null
  })
  return tuple
}
