import { useEffect } from 'react'
import { matchPath as matchReactPath, useLocation, useNavigate, useParams } from 'react-router'

import type { ListRouteChange, ListRouteOptions, ListRouteResult } from './list-types.js'
import type { NavigateOptions, QueryParams, RouteParams } from './types.js'
import { generatePath } from './utilities.js'

/** Parse a positive safe integer without treating `2oops`, `1.5` or an overflow as a page. */
function readPage(value: string | null, pageSize: number): number {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1
  const page = Number(value)
  return Number.isSafeInteger(page) && Number.isSafeInteger((page - 1) * pageSize) ? page : 1
}

/** Apply only the explicitly owned query keys, leaving unrelated and repeated values intact. */
function patchQuery(search: URLSearchParams, patch: QueryParams): void {
  for (const [key, value] of Object.entries(patch)) {
    search.delete(key)
    if (Array.isArray(value)) value.forEach((entry) => search.append(key, entry))
    else if (value !== undefined) search.set(key, value)
  }
}

/** Match a selection's query constraints, including explicit absence and repeated values. */
function matchesQuery(search: URLSearchParams, query: QueryParams = {}): boolean {
  return Object.entries(query).every(([key, value]) => {
    const expected = value === undefined ? [] : Array.isArray(value) ? value : [value]
    const actual = search.getAll(key)
    return actual.length === expected.length && actual.every((entry, i) => entry === expected[i])
  })
}

/** Match-pattern params are still URL encoded; tolerate malformed escapes just as React Router does. */
function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch (_error) {
    // A malformed incoming URL is still a usable literal filter; do not crash the page.
    return value
  }
}

/**
 * Own URL-backed pagination, filters and selected views without mirrored state or navigation effects.
 * Works inside `BrowserRouter`, `MemoryRouter` and data routers; no data-router-only
 * `useNavigation` call or MoleculeRouterProvider is needed. Ordinary links, direct visits,
 * and Back/Forward all read the same URL. Page links retain path parameters and unrelated
 * queries; changing filters or views resets the page atomically. Protected views wait for
 * auth and redirect only a confirmed signed-out session, with `state.returnTo` set.
 *
 * @param options - App-owned filter sources, view paths, pagination and optional auth readiness.
 * @returns Reactive list state plus link builders and navigation actions. Gate data queries with `canLoad`.
 */
export function useListRoute<Filter extends string = string, Selection extends string = string>(
  options: ListRouteOptions<Filter, Selection> = {},
): ListRouteResult<Filter, Selection> {
  const location = useLocation()
  const navigate = useNavigate()
  const routeParams = useParams()
  const { pageSize = 20, pageParam = 'page', auth } = options
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) {
    throw new Error('useListRoute: pageSize must be a positive safe integer')
  }
  const search = new URLSearchParams(location.search)
  const selections = Object.entries(options.selections ?? {}) as [
    Selection,
    NonNullable<ListRouteOptions<Filter, Selection>['selections']>[Selection],
  ][]
  const candidates = selections
    .map(([name, config]) => ({
      name,
      config,
      match: matchReactPath({ path: config.path, end: true }, location.pathname),
    }))
    .filter(({ config, match }) => match && matchesQuery(search, config.query))
    .sort(
      (a, b) =>
        Object.keys(b.config.query ?? {}).length - Object.keys(a.config.query ?? {}).length ||
        Number(b.name === options.defaultSelection) - Number(a.name === options.defaultSelection),
    )
  const selected = candidates[0]
  const selection = selected?.name ?? options.defaultSelection
  const currentSelection = options.selections?.[selection as Selection]
  const pattern = selected?.config.path ?? options.path
  const matchedParams =
    selected?.match?.params ??
    (pattern ? matchReactPath({ path: pattern, end: true }, location.pathname)?.params : undefined)
  const params: RouteParams = {}
  for (const [key, value] of Object.entries(matchedParams ?? {})) {
    if (value !== undefined) params[key] = decodeParam(value)
  }
  // React Router's route context already decodes params; it wins over pattern matches.
  for (const [key, value] of Object.entries(routeParams)) {
    if (value !== undefined) params[key] = value
  }
  const filterEntries = Object.entries(options.filters ?? {}) as [
    Filter,
    NonNullable<ListRouteOptions<Filter, Selection>['filters']>[Filter],
  ][]
  const filters = Object.fromEntries(
    filterEntries.map(([name, source]) => {
      const pathValue: string | undefined = source.param ? params[source.param] : undefined
      const queryValue = source.query || !source.param ? search.get(source.query ?? name) : null
      return [name, pathValue ?? queryValue ?? source.defaultValue]
    }),
  ) as Record<Filter, string | undefined>
  const page = readPage(search.get(pageParam), pageSize)
  const requiresAuth = currentSelection?.requiresAuth === true
  if (requiresAuth && !auth) {
    throw new Error('useListRoute: protected selections require auth.status and auth.redirectTo')
  }
  const status = requiresAuth && auth?.status !== 'authenticated' ? auth!.status : 'ready'
  const redirectTo = status === 'unauthenticated' ? auth?.redirectTo : undefined
  const returnTo = location.pathname + location.search + location.hash

  useEffect(() => {
    if (redirectTo && redirectTo !== returnTo) {
      void navigate(redirectTo, { replace: true, state: { returnTo } })
    }
  }, [navigate, redirectTo, returnTo])

  const href = (change: ListRouteChange<Filter, Selection> = {}): string => {
    const nextQuery = new URLSearchParams(location.search)
    const nextParams = { ...params, ...change.params }
    let pathname = location.pathname
    let nextPattern = pattern
    if (change.selection !== undefined) {
      const target = options.selections?.[change.selection]
      if (!target) throw new Error(`useListRoute: unknown selection "${change.selection}"`)
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
      const source = options.filters?.[name]
      if (!source) throw new Error(`useListRoute: unknown filter "${name}"`)
      if (source.param && !source.query && params[source.param] === undefined) {
        throw new Error(`useListRoute: path filter "${name}" requires param "${source.param}"`)
      }
      filterChanged ||= value !== filters[name]
      if (source.param && params[source.param] !== undefined) {
        if (value === undefined) {
          throw new Error(`useListRoute: path filter "${name}" cannot be removed`)
        }
        nextParams[source.param] = value
        pathChanged = true
        if (source.query) nextQuery.delete(source.query)
      } else {
        patchQuery(nextQuery, {
          [source.query ?? name]: value === source.defaultValue ? undefined : value,
        })
      }
    }
    if (pathChanged) {
      if (!nextPattern)
        throw new Error('useListRoute: changing path parameters requires a path pattern')
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
      throw new Error('useListRoute: page must be a positive safe integer')
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
