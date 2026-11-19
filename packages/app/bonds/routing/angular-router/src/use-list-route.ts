/**
 * `useListRoute` over the Angular Router: the list rules come from
 * `@molecule/app-routing`'s `resolveListRoute`, which every framework's
 * `useListRoute` shares.
 *
 * @module
 */

import { computed, DestroyRef, effect, inject, isSignal, type Signal, signal } from '@angular/core'

import type {
  ListRouteChange,
  ListRouteOptions,
  ListRouteResult,
  NavigateOptions,
  RouteParams,
} from '@molecule/app-routing'
import { listRouteRedirect, resolveListRoute } from '@molecule/app-routing'

import { useMoleculeRouter } from './hooks.js'

/**
 * What {@link useListRoute} returns: each list state field as a signal (the same fields
 * React's result carries as plain values) and the list's link builder and navigation
 * actions. This is the shape `@molecule/app-angular`'s `useListRoute` returns.
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
 * The options {@link useListRoute} takes: a plain object, or a signal of one when the
 * app's auth status changes on the same mounted component (a new status re-resolves the
 * list, the way React re-renders `useListRoute`).
 *
 * @template Filter - The filter names.
 * @template Selection - The selection names.
 */
export type ListRouteOptionsInput<
  Filter extends string = string,
  Selection extends string = string,
> = ListRouteOptions<Filter, Selection> | Signal<ListRouteOptions<Filter, Selection>>

/**
 * Own URL-backed pagination, filters and selected views without mirrored state or
 * navigation effects. Works inside any Angular application whose injector has Angular's
 * `Router` (`provideRouter(routes)`, or `provideRouter` plus `provideLocationMocks()` for
 * a memory history); no molecule provider is needed. Ordinary links, direct visits and
 * Back/Forward all read the same URL. Page links retain path parameters and unrelated
 * queries; changing filters or views resets the page atomically. Protected views wait for
 * auth and redirect only a confirmed signed-out session, with `state.returnTo` set.
 *
 * Call it in an injection context (a component field initializer or constructor). The
 * options may be a signal: an auth status going from `loading` to `unauthenticated`
 * reaches the list on the same component, the way React re-renders `useListRoute` with
 * new options.
 *
 * @param options - App-owned filter sources, view paths, pagination and optional auth
 *   readiness (or a signal of them).
 * @returns Reactive list state as signals, plus link builders and navigation actions.
 *   Gate data queries with `canLoad`.
 * @throws {I18nError} When `pageSize` is not a positive safe integer, or a protected view
 *   has no `auth`.
 * @example
 * ```ts
 * @Component({
 *   selector: 'app-articles',
 *   template: '<a [href]="list.href({ page: list.page() + 1 })">Next</a>',
 * })
 * export class ArticlesComponent {
 *   // Load items from list.offset(); the page and filters come from the URL.
 *   readonly list = useListRoute({ pageSize: 10, filters: { tag: {} } })
 * }
 * ```
 */
export function useListRoute<Filter extends string = string, Selection extends string = string>(
  options: ListRouteOptionsInput<Filter, Selection> = {},
): UseListRouteResult<Filter, Selection> {
  const router = useMoleculeRouter()
  const location = signal(router.getLocation())
  const routeParams = signal(router.getParams())
  const stop = router.subscribe(() => {
    location.set(router.getLocation())
    routeParams.set(router.getParams())
  })
  inject(DestroyRef).onDestroy(stop)

  // The options may be a signal; a plain object never changes on this component.
  const readOptions = (): ListRouteOptions<Filter, Selection> =>
    isSignal(options) ? options() : options
  // Re-resolved from the current location alone, exactly as React re-renders: a
  // navigation (or an options change) recomputes every field.
  const list = computed(() =>
    resolveListRoute<Filter, Selection>(
      { location: location(), routeParams: routeParams() },
      readOptions(),
      router.navigate,
    ),
  )
  // Resolve once at the call site: an invalid pageSize or a protected selection without
  // auth throws here, the way React's render throws (a lazy computed would defer the
  // throw to the first template read).
  list()
  // React performs the redirect after the render that reported it; this effect runs it
  // at the same point, and re-runs while the redirect target moves.
  effect(() => {
    const redirect = listRouteRedirect(list(), location())
    if (redirect === undefined) return
    void router.navigate(redirect.to, redirect.options)
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
