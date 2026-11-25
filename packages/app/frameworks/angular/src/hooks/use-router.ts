/**
 * Angular functions for routing, mirroring `useRouter`, `useRouterInstance`,
 * `useLinkRouter`, `useLocation`, `useParams`, `useQuery`, `useNavigate`,
 * `useIsActive`, `useListRoute` and `useConsumedSearchParam` from
 * `@molecule/app-react`.
 *
 * @module
 */

import {
  afterNextRender,
  computed,
  DestroyRef,
  effect,
  inject,
  type Signal,
  signal,
  untracked,
} from '@angular/core'

import { I18nError } from '@molecule/app-i18n'
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
  resolveLinkPath,
  resolveListRoute,
} from '@molecule/app-routing'

import { type MaybeSignal, readMaybeSignal } from '../maybe-signal.js'
import { ROUTER } from '../tokens.js'

/**
 * The router the routing functions and the `Link` directive navigate through:
 * the registered one. Both {@link useRouterInstance} and {@link useLinkRouter}
 * fail through this one function, so the error and its text live in one place.
 *
 * @param router - The router read from the injector, or `null` with none registered.
 * @returns The router.
 * @throws {I18nError} When no router is registered: add the routing bond's
 * `provideMoleculeRouter()` (`@molecule/app-routing-angular-router`) to the app's providers,
 * after Angular's `provideRouter(routes)`, or pass `router` to `provideMolecule`.
 */
function requireRouter(router: Router | null): Router {
  if (!router) {
    throw new I18nError(
      'angular.error.useRouterOutsideProvider',
      undefined,
      "No router here. Add `provideMoleculeRouter()` from the routing bond (`@molecule/app-routing-angular-router`) to the app's providers, after Angular's `provideRouter(routes)`, or pass `router` to `provideMolecule`. If the app already does this, its routing bond is older than this binding: update it (`npm install @molecule/app-routing-angular-router@latest`).",
    )
  }
  return router
}

/**
 * The router registered by `provideMolecule({ router })` or `provideRouter`.
 * Call it in an injection context.
 *
 * @returns The router instance.
 * @throws {I18nError} When no router is registered: add the routing bond's
 * `provideMoleculeRouter()` (`@molecule/app-routing-angular-router`) to the app's providers,
 * after Angular's `provideRouter(routes)`, or pass `router` to `provideMolecule`.
 */
export function useRouterInstance(): Router {
  return requireRouter(inject(ROUTER, { optional: true }))
}

/**
 * The router a link to `to` navigates through, among the routers registered.
 *
 * @param mounted - The router read from the injector, or `null` with none registered.
 * @param to - The link's destination: an app path or a URL.
 * @returns The router, or `null` for a URL outside the app with none registered.
 * @throws {I18nError} When `to` is an app path and no router is registered.
 */
function linkRouter(mounted: Router | null, to: string): Router | null {
  // A URL outside the app opens through the browser or the device's URL handler: no router navigates it.
  return resolveLinkPath(to) === null ? mounted : requireRouter(mounted)
}

/**
 * The router a link navigates through, React's `useLinkRouter` in Angular's
 * idiom: the registered router, or `null` for a URL outside the app when none
 * is. The browser, or on a device the URL handler, opens such a URL, so a link
 * to it renders in an app with no router (a widget, a static page). A link to
 * an app path still fails without one: that is how an app that forgot to
 * register its router finds out.
 *
 * The `Link` directive uses it. With a destination it answers for that one and
 * follows it while the injector's host lives. Without one (a directive's input
 * is not set when its field initializers run) it returns a function to call
 * with the destination wherever it is known. Call it in an injection context
 * (a constructor or a field initializer), which reads the injector once.
 *
 * @param to - The link's destination: an app path or a URL, or a signal of one.
 * @returns A signal of the router the link navigates through, or `null` for a URL
 * outside the app with no router registered.
 * @throws {I18nError} When `to` is an app path and no router is registered: the error
 * {@link useRouterInstance} throws, with the same fix.
 *
 * @example
 * ```ts
 * const router = useLinkRouter(to)
 * href = computed(() => router() === null ? to() : routerLinkHref(to(), router()))
 * ```
 */
export function useLinkRouter(to: MaybeSignal<string>): Signal<Router | null>
/**
 * Reads the router without a destination yet.
 *
 * @returns A function that takes a link's destination and gives the router it
 * navigates through, or `null` for a URL outside the app with no router registered.
 * @throws {I18nError} Never here: the returned function throws for an app path with no router
 * registered, the error {@link useRouterInstance} throws.
 *
 * @example
 * ```ts
 * const linkRouter = useLinkRouter()
 * const router = computed(() => linkRouter(to()))
 * ```
 */
export function useLinkRouter(): (to: string) => Router | null
export function useLinkRouter(
  to?: MaybeSignal<string>,
): Signal<Router | null> | ((to: string) => Router | null) {
  const mounted = inject(ROUTER, { optional: true })
  if (to === undefined) return (destination) => linkRouter(mounted, destination)
  const router = computed(() => linkRouter(mounted, readMaybeSignal(to)))
  // Read now, so an app path with no router registered fails in the injection context, as a hook that needs a provider does.
  router()
  return router
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
 * The arguments may be signals: the active flag then follows a changed path or
 * `exact` on the same component, the way React re-renders `useIsActive` with
 * new arguments. A signal holding `undefined` for `exact` matches an omitted
 * argument (`false`).
 *
 * @param path - The path to check (or a signal of it).
 * @param exact - Whether to match exactly (default: `false`, or a signal of
 *   it).
 * @returns A signal of whether the path is active.
 */
export function useIsActive(
  path: MaybeSignal<string>,
  exact: MaybeSignal<boolean | undefined> = false,
): Signal<boolean> {
  const router = useRouterInstance()
  const readExact = (): boolean => readMaybeSignal(exact) ?? false
  const active = signal<boolean>(router.isActive(readMaybeSignal(path), readExact()))
  const stop = router.subscribe(() =>
    active.set(router.isActive(readMaybeSignal(path), readExact())),
  )
  // React recomputes the same expression when a re-render passes new
  // arguments; a signal argument changes it on this component instead.
  effect(() => {
    const nextPath = readMaybeSignal(path)
    const nextExact = readMaybeSignal(exact)
    untracked(() => active.set(router.isActive(nextPath, nextExact ?? false)))
  })
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
  options: MaybeSignal<ListRouteOptions<Filter, Selection>> = {},
): UseListRouteResult<Filter, Selection> {
  const { location, params, navigate } = useRouter()
  // The options may be a signal; a plain object never changes on this component.
  const readOptions = (): ListRouteOptions<Filter, Selection> => readMaybeSignal(options)
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
