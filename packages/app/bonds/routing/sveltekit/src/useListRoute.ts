/**
 * `useListRoute` over the bond's router: the list rules come from
 * `@molecule/app-routing`'s `resolveListRoute`, which every framework's `useListRoute`
 * shares.
 *
 * @module
 */

import { onDestroy, onMount, tick } from 'svelte'
import { derived, get, type Readable, readable, writable } from 'svelte/store'

import type { ListRouteOptions, ListRouteResult, RouteParams } from '@molecule/app-routing'
import { listRouteRedirect, resolveListRoute } from '@molecule/app-routing'

import { useMoleculeRouter } from './useMoleculeRouter.js'

/**
 * A plain value or a readable store of one. A hook runs once per component, so a store
 * is the only way it can see a new argument — the way React's hooks see a re-render. A
 * store of `undefined` means the argument was omitted, and the parameter's default
 * applies.
 */
type MaybeReadable<T> = T | Readable<T>

/**
 * Whether a value is a readable store. A molecule store (`@molecule/app-state`'s
 * `Store`, which has `getState` AND `subscribe`) is a VALUE, never a source.
 *
 * @param value - A hook argument: a plain value or a store.
 * @returns `true` for a readable store.
 */
const isReadable = (value: unknown): value is Readable<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { subscribe?: unknown }).subscribe === 'function' &&
  typeof (value as { getState?: unknown }).getState !== 'function'

/**
 * The readable-store view of a hook argument: the store itself when it is one, a
 * constant store of the plain value otherwise.
 *
 * @param value - A plain value or a store of one.
 * @returns A readable store of the value.
 */
const toReadable = <T>(value: MaybeReadable<T>): Readable<T> =>
  isReadable(value) ? (value as Readable<T>) : readable(value)

/**
 * One picked field of a state store, as its own readable store.
 *
 * @param state - The store holding the whole state object.
 * @param key - The field to project out.
 * @returns A readable store of that field's current value.
 */
const fieldStore = <T, K extends keyof T>(state: Readable<T>, key: K): Readable<T[K]> =>
  derived(state, (current) => current[key])

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

/**
 * URL-backed pagination, filters and selected views, React's `useListRoute` in Svelte's
 * idiom: the page, the filters and the view live in the URL only, so a reload, a shared
 * link and Back all show the same list. Each list field is a readable store that follows
 * the location, and the actions are plain functions, through the router the nearest
 * `MoleculeRouterProvider` built over the app's SvelteKit navigation. Built on
 * `resolveListRoute` from `@molecule/app-routing`, so every framework binding returns the
 * same result.
 *
 * A signed-out visit to a view with `requiresAuth` replaces the entry with
 * `options.auth.redirectTo`, carrying `state.returnTo`; until auth is confirmed `canLoad`
 * is `false`.
 *
 * The options may be a plain value or a readable store of one (a store holding
 * `undefined` means the default options): an auth status moving from `loading` to
 * `unauthenticated` re-resolves the list — and performs the sign-in redirect — on the
 * same component, the way React re-renders `useListRoute`.
 *
 * Call it during a component's initialisation, where Svelte reads context.
 *
 * @param options - Filter sources, view paths, pagination and optional auth readiness (or a store of them).
 * @returns Each list field as a readable store, and its link builder and navigation actions.
 * @throws {Error} When `pageSize` is not a positive safe integer, or a protected view has no `auth`.
 * @throws {I18nError} `routing.sveltekit.error.useMoleculeRouterOutsideRouter` when no
 * `MoleculeRouterProvider` is above the caller.
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useListRoute } from '@molecule/app-routing-sveltekit'
 *
 *   const { page, offset, href } = useListRoute({ pageSize: 10, filters: { tag: {} } })
 *   // Load items from $offset; the page and filters come from the URL.
 * </script>
 *
 * <a href={href({ page: $page + 1 })}>Next</a>
 * ```
 */
export function useListRoute<Filter extends string = string, Selection extends string = string>(
  options: MaybeReadable<ListRouteOptions<Filter, Selection> | undefined> = {},
): UseListRouteResult<Filter, Selection> {
  const router = useMoleculeRouter()
  const optionsStore = toReadable(options)
  let currentOptions = get(optionsStore) ?? {}
  const resolve = (): ListRouteResult<Filter, Selection> =>
    resolveListRoute<Filter, Selection>(
      { location: router.getLocation(), routeParams: router.getParams() },
      currentOptions,
      (path, navigateOptions) => router.navigate(path, navigateOptions),
    )
  let latest = resolve()
  const state = writable(latest)
  // The redirect a resolution asks for runs once Svelte has applied the update, and only while
  // this component is mounted, as React's runs in an effect after the commit: the router tells
  // every subscriber about a navigation before kit renders it, a page kit is about to replace
  // included, and that page must not redirect from an address it will never show.
  let mounted = true
  let redirectQueued = false
  const redirectIfAsked = (): void => {
    redirectQueued = false
    if (!mounted) return
    const redirect = listRouteRedirect(latest, router.getLocation())
    if (redirect) router.navigate(redirect.to, redirect.options)
  }
  // One re-resolve per location (or options) change, then the redirect it asks for:
  // navigating notifies this subscription again, and at the sign-in URL
  // `listRouteRedirect` answers undefined, so the update settles.
  const update = (): void => {
    latest = resolve()
    state.set(latest)
    if (redirectQueued) return
    redirectQueued = true
    void tick().then(redirectIfAsked)
  }
  const stopRouter = router.subscribe(() => update())
  // The options store calls back at once with the options already read, which changes
  // nothing; a later set re-resolves the list.
  const stopOptions = optionsStore.subscribe((next) => {
    if (next === currentOptions) return
    currentOptions = next ?? {}
    update()
  })
  // React's redirect effect also runs once mounted, for a list that opens directly on a
  // signed-out protected view.
  onMount(update)
  onDestroy(() => {
    mounted = false
    stopRouter()
    stopOptions()
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
