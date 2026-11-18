/**
 * `useListQuery`: one cached read driven by a URL list route.
 *
 * @module
 */
import type { QueryOptions } from '@molecule/app-query'

import type { UseQueryResult } from './types.js'
import { useQuery } from './useQuery.js'

/**
 * One input of {@link useListQuery}. React reads every input afresh on each render, so a
 * source is the value itself; the other bindings also take a ref, accessor, store or signal.
 */
export type ListQuerySource<T> = T

/** Each input of {@link useListQuery} as a {@link ListQuerySource}. */
export type ListQueryInputs<Values> = {
  readonly [Key in keyof Values]: ListQuerySource<Values[Key]>
}

/**
 * The list route a list query reads: `useListRoute` from `@molecule/app-react` returns these
 * values (and more), so its result is passed as it is.
 */
export interface ListQueryRoute<Filter extends string = string> {
  /** False while a protected view waits for auth, is signed out, or is unavailable. */
  readonly canLoad: boolean
  /** The current URL filter values. */
  readonly filters: Readonly<Record<Filter, string | undefined>>
  /** The configured items per page. */
  readonly pageSize: number
  /** The zero-indexed item offset for the API request. */
  readonly offset: number
}

/** The route's current values, as `read` receives them. */
export interface ListQueryState<Filter extends string = string> {
  /** The current URL filter values. */
  readonly filters: Readonly<Record<Filter, string | undefined>>
  /** The configured items per page. */
  readonly pageSize: number
  /** The zero-indexed item offset for the API request. */
  readonly offset: number
}

/**
 * Observe the page a URL list route points at. `read` builds the query from the current value of
 * each input (the signed-in `viewer`, request params, a parent record's id) and the route's
 * filters, page size and offset. The query is disabled (`null`, no request) while `viewer` is
 * null (auth is still being restored) or the route cannot load yet; a changed input or URL moves
 * the same observer to the new page.
 *
 * @example
 * ```tsx
 * const route = useListRoute({ pageSize: 10, filters: { tag: {} } })
 * const query = useListQuery(route, { viewer, params }, ({ viewer, params }, list) =>
 *   articles.list(viewer, { ...params, tag: list.filters.tag, limit: list.pageSize, offset: list.offset }),
 * )
 * ```
 *
 * @param route - The list route, usually `useListRoute(...)` from `@molecule/app-react`.
 * @param inputs - The current values; `viewer` is the signed-in user's id, 'anonymous', or null
 *   while auth is restoring.
 * @param read - Builds the page's query options, e.g. a generated `articlesPage(...)`.
 * @returns The query state, as {@link useQuery} returns it.
 */
export function useListQuery<
  T,
  Values extends { viewer: string | null },
  Filter extends string = string,
>(
  route: ListQueryRoute<Filter>,
  inputs: ListQueryInputs<Values>,
  read: (values: Values & { viewer: string }, list: ListQueryState<Filter>) => QueryOptions<T>,
): UseQueryResult<T> {
  const values: Values = inputs
  const { viewer } = values
  return useQuery<T>(
    viewer === null || !route.canLoad
      ? null
      : read(
          { ...values, viewer },
          { filters: route.filters, pageSize: route.pageSize, offset: route.offset },
        ),
  )
}
