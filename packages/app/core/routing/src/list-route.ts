/**
 * `resolveListRoute`: URL-backed pagination, filters and selected views, computed from the
 * current location alone. Every framework's `useListRoute` calls it on each location
 * change, so a list behaves the same under React Router, Vue Router, Solid Router,
 * Angular Router and SvelteKit.
 *
 * @module
 */

import { I18nError } from '@molecule/app-i18n'

import type {
  ListRouteChange,
  ListRouteNavigate,
  ListRouteOptions,
  ListRouteRedirect,
  ListRouteResult,
  ListRouteSelection,
  ListRouteSource,
} from './list-route-types.js'
import { matchRoutePattern } from './route-pattern.js'
import type { NavigateOptions, QueryParams, RouteParams } from './types.js'
import { generatePath } from './utilities.js'

/**
 * Parses a positive safe integer without treating `2oops`, `1.5` or an overflow as a page.
 *
 * @param value - The query value.
 * @param pageSize - Items per page, so the offset stays safe too.
 * @returns The page, or 1.
 */
function readPage(value: string | null, pageSize: number): number {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1
  const page = Number(value)
  return Number.isSafeInteger(page) && Number.isSafeInteger((page - 1) * pageSize) ? page : 1
}

/**
 * Applies only the explicitly owned query keys, leaving unrelated and repeated values intact.
 *
 * @param search - The query to change.
 * @param patch - Keys to set (an array appends each value) or remove (`undefined`).
 */
function patchQuery(search: URLSearchParams, patch: QueryParams): void {
  for (const [key, value] of Object.entries(patch)) {
    search.delete(key)
    if (Array.isArray(value)) value.forEach((entry) => search.append(key, entry))
    else if (value !== undefined) search.set(key, value)
  }
}

/**
 * Matches a selection's query constraints, including explicit absence and repeated values.
 *
 * @param search - The current query.
 * @param query - The selection's query values.
 * @returns Whether every constraint holds.
 */
function matchesQuery(search: URLSearchParams, query: QueryParams = {}): boolean {
  return Object.entries(query).every(([key, value]) => {
    const expected = value === undefined ? [] : Array.isArray(value) ? value : [value]
    const actual = search.getAll(key)
    return actual.length === expected.length && actual.every((entry, i) => entry === expected[i])
  })
}

/**
 * Decodes a matched param. A malformed escape stays a usable literal, as React Router keeps it.
 *
 * @param value - The still-encoded param.
 * @returns The decoded value.
 */
function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch (_error) {
    // A malformed incoming URL is still a usable literal filter; do not crash the page.
    return value
  }
}

/**
 * Computes a URL-backed list's state from the current location, plus link builders and
 * navigation actions over `navigate`. Pure: call it again whenever the location (or the
 * options, such as the auth status) changes. A signed-out visit to a protected view
 * reports `redirectTo`; perform it with {@link listRouteRedirect}.
 *
 * @param source - The current location and the native router's decoded route params.
 * @param options - Filter sources, view paths, pagination and optional auth readiness.
 * @param navigate - The router's `navigate`.
 * @returns The list state and actions.
 * @throws {I18nError} When `pageSize` is not a positive safe integer, or a protected
 *   selection is configured without `auth`.
 *
 * @example
 * ```ts
 * const router = getRouter()
 * const list = resolveListRoute(
 *   { location: router.getLocation(), routeParams: router.getParams() },
 *   { pageSize: 10, filters: { tag: {} } },
 *   router.navigate,
 * )
 * list.href({ page: 2 }) // '/articles?tag=news&page=2' on /articles?tag=news
 * ```
 */
export function resolveListRoute<Filter extends string = string, Selection extends string = string>(
  source: ListRouteSource,
  options: ListRouteOptions<Filter, Selection>,
  navigate: ListRouteNavigate,
): ListRouteResult<Filter, Selection> {
  const { location, routeParams = {} } = source
  const { pageSize = 20, pageParam = 'page', auth } = options
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) {
    throw new I18nError(
      'routing.listRoute.error.pageSize',
      undefined,
      'useListRoute: pageSize must be a positive safe integer',
    )
  }
  const search = new URLSearchParams(location.search)
  const selections = Object.entries(options.selections ?? {}) as [Selection, ListRouteSelection][]
  const candidates = selections
    .map(([name, config]) => ({
      name,
      config,
      match: matchRoutePattern(config.path, location.pathname),
    }))
    .filter(({ config, match }) => match && matchesQuery(search, config.query))
    .sort(
      (a, b) =>
        Object.keys(b.config.query ?? {}).length - Object.keys(a.config.query ?? {}).length ||
        Number(b.name === options.defaultSelection) - Number(a.name === options.defaultSelection),
    )
  const selected = candidates[0]
  const selection = selected?.name ?? options.defaultSelection
  const currentSelection =
    selection === undefined ? undefined : options.selections?.[selection as Selection]
  const pattern = selected?.config.path ?? options.path
  const matchedParams =
    selected?.match?.params ??
    (pattern ? matchRoutePattern(pattern, location.pathname)?.params : undefined)
  const params: RouteParams = {}
  for (const [key, value] of Object.entries(matchedParams ?? {})) {
    if (value !== undefined) params[key] = decodeParam(value)
  }
  // The native router's route params are already decoded; they win over pattern matches.
  for (const [key, value] of Object.entries(routeParams)) {
    if (value !== undefined) params[key] = value
  }
  const filterEntries = Object.entries(options.filters ?? {}) as [
    Filter,
    NonNullable<ListRouteOptions<Filter, Selection>['filters']>[Filter],
  ][]
  const filters = Object.fromEntries(
    filterEntries.map(([name, filter]) => {
      const pathValue: string | undefined = filter.param ? params[filter.param] : undefined
      const queryValue = filter.query || !filter.param ? search.get(filter.query ?? name) : null
      return [name, pathValue ?? queryValue ?? filter.defaultValue]
    }),
  ) as Record<Filter, string | undefined>
  const page = readPage(search.get(pageParam), pageSize)
  const requiresAuth = currentSelection?.requiresAuth === true
  if (requiresAuth && !auth) {
    throw new I18nError(
      'routing.listRoute.error.authRequired',
      undefined,
      'useListRoute: protected selections require auth.status and auth.redirectTo',
    )
  }
  const status = requiresAuth && auth && auth.status !== 'authenticated' ? auth.status : 'ready'
  const redirectTo = status === 'unauthenticated' ? auth?.redirectTo : undefined

  const href = (change: ListRouteChange<Filter, Selection> = {}): string => {
    const nextQuery = new URLSearchParams(location.search)
    const nextParams = { ...params, ...change.params }
    let pathname = location.pathname
    let nextPattern = pattern
    if (change.selection !== undefined) {
      const target = options.selections?.[change.selection]
      if (!target) {
        throw new I18nError(
          'routing.listRoute.error.unknownSelection',
          { selection: change.selection },
          'useListRoute: unknown selection "{{selection}}"',
        )
      }
      // A selection owns only the union of the configured selection query keys.
      for (const [, config] of selections) {
        for (const key of Object.keys(config.query ?? {})) nextQuery.delete(key)
      }
      patchQuery(nextQuery, target.query ?? {})
      nextPattern = target.path
    }
    let pathChanged = change.selection !== undefined || change.params !== undefined
    let filterChanged = false
    for (const [name, value] of Object.entries(change.filters ?? {}) as [
      Filter,
      string | undefined,
    ][]) {
      const filter = options.filters?.[name]
      if (!filter) {
        throw new I18nError(
          'routing.listRoute.error.unknownFilter',
          { filter: name },
          'useListRoute: unknown filter "{{filter}}"',
        )
      }
      if (filter.param && !filter.query && params[filter.param] === undefined) {
        throw new I18nError(
          'routing.listRoute.error.pathFilterParam',
          { filter: name, param: filter.param },
          'useListRoute: path filter "{{filter}}" requires param "{{param}}"',
        )
      }
      filterChanged ||= value !== filters[name]
      if (filter.param && params[filter.param] !== undefined) {
        if (value === undefined) {
          throw new I18nError(
            'routing.listRoute.error.pathFilterRemoved',
            { filter: name },
            'useListRoute: path filter "{{filter}}" cannot be removed',
          )
        }
        nextParams[filter.param] = value
        pathChanged = true
        if (filter.query) nextQuery.delete(filter.query)
      } else {
        patchQuery(nextQuery, {
          [filter.query ?? name]: value === filter.defaultValue ? undefined : value,
        })
      }
    }
    if (pathChanged) {
      if (!nextPattern) {
        throw new I18nError(
          'routing.listRoute.error.pathPattern',
          undefined,
          'useListRoute: changing path parameters requires a path pattern',
        )
      }
      pathname = generatePath(nextPattern, nextParams)
    }
    const nextPage =
      change.page ??
      (filterChanged || change.selection !== undefined || change.params !== undefined ? 1 : page)
    if (
      !Number.isSafeInteger(nextPage) ||
      nextPage < 1 ||
      !Number.isSafeInteger((nextPage - 1) * pageSize)
    ) {
      throw new I18nError(
        'routing.listRoute.error.page',
        undefined,
        'useListRoute: page must be a positive safe integer',
      )
    }
    patchQuery(nextQuery, { [pageParam]: nextPage === 1 ? undefined : String(nextPage) })
    const query = nextQuery.toString()
    return pathname + (query ? `?${query}` : '') + location.hash
  }

  const go = (change: ListRouteChange<Filter, Selection>, navOptions?: NavigateOptions): void => {
    void navigate(href(change), { state: location.state, ...navOptions })
  }

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    filters,
    selection,
    params,
    canLoad: status === 'ready',
    status,
    redirectTo,
    href,
    navigate: go,
    setPage: (next, navOptions) => go({ page: next }, navOptions),
    setFilters: (next, navOptions) => go({ filters: next }, navOptions),
    select: (next, navOptions) => go({ selection: next }, navOptions),
  }
}

/**
 * The navigation a list makes when a confirmed signed-out visitor opens a protected view:
 * replace the entry with the sign-in URL, carrying `state.returnTo`. A framework's
 * `useListRoute` performs it after each change of `redirectTo` or the location.
 *
 * @param list - The resolved list.
 * @param location - The current location.
 * @returns The redirect, or `undefined` when there is none (or the visitor is already there).
 */
export function listRouteRedirect(
  list: Pick<ListRouteResult, 'redirectTo'>,
  location: ListRouteSource['location'],
): ListRouteRedirect | undefined {
  const returnTo = location.pathname + location.search + location.hash
  if (!list.redirectTo || list.redirectTo === returnTo) return undefined
  return { to: list.redirectTo, options: { replace: true, state: { returnTo } } }
}
