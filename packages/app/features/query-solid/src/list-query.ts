/**
 * `useListQuery`: one cached read driven by a URL list route.
 *
 * @module
 */
import type { Accessor } from 'solid-js'

import type { QueryOptions } from '@molecule/app-query'

import type { UseQueryResult } from './types.js'
import { useQuery } from './use-query.js'

/** A plain value or an accessor: each input {@link useListQuery} reads reactively. */
export type ListQuerySource<T> = T | Accessor<T>

/** Each input of {@link useListQuery} as a {@link ListQuerySource}. */
export type ListQueryInputs<Values> = {
  readonly [Key in keyof Values]: ListQuerySource<Values[Key]>
}

/**
 * The list route a list query reads: `useListRoute` from `@molecule/app-solid` returns these
 * accessors (and more), so its result is passed as it is.
 */
export interface ListQueryRoute<Filter extends string = string> {
  /** False while a protected view waits for auth, is signed out, or is unavailable. */
  readonly canLoad: Accessor<boolean>
  /** The current URL filter values. */
  readonly filters: Accessor<Readonly<Record<Filter, string | undefined>>>
  /** The configured items per page. */
  readonly pageSize: Accessor<number>
  /** The zero-indexed item offset for the API request. */
  readonly offset: Accessor<number>
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
 * Reads a plain value or an accessor; inside the query's options accessor the read is tracked.
 *
 * @param source - The argument as the caller passed it.
 * @returns Its current value.
 */
const access = <T>(source: ListQuerySource<T>): T =>
  typeof source === 'function' ? (source as Accessor<T>)() : source

/**
 * Observe the page a URL list route points at. `read` builds the query from the current value of
 * each input (the signed-in `viewer`, request params, a parent record's id) and the route's
 * filters, page size and offset. The query is disabled (`null`, no request) while `viewer` is
 * null (auth is still being restored) or the route cannot load yet; a changed input or URL moves
 * the same observer to the new page.
 *
 * @param route - The list route, usually `useListRoute(...)` from `@molecule/app-solid`.
 * @param inputs - Plain values or accessors; `viewer` is the signed-in user's id, 'anonymous',
 *   or null while auth is restoring.
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
  return useQuery<T>(() => {
    const values: Partial<Values> = {}
    for (const key of Object.keys(inputs) as (keyof Values)[])
      values[key] = access<Values[keyof Values]>(inputs[key])
    const { viewer } = values as Values
    if (viewer === null || !route.canLoad()) return null
    return read(
      { ...(values as Values), viewer },
      { filters: route.filters(), pageSize: route.pageSize(), offset: route.offset() },
    )
  })
}
