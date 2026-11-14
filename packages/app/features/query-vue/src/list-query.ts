/**
 * `useListQuery`: one cached read driven by a URL list route.
 *
 * @module
 */
import { type MaybeRefOrGetter, type Ref, toValue } from 'vue'

import type { QueryOptions } from '@molecule/app-query'

import type { UseQueryResult } from './types.js'
import { useQuery } from './useQuery.js'

/** A plain value, a ref or a getter: each input {@link useListQuery} reads reactively. */
export type ListQuerySource<T> = MaybeRefOrGetter<T>

/** Each input of {@link useListQuery} as a {@link ListQuerySource}. */
export type ListQueryInputs<Values> = {
  readonly [Key in keyof Values]: ListQuerySource<Values[Key]>
}

/**
 * The list state a list query reads. `useListRoute` from `@molecule/app-vue` returns it as a
 * computed ref, which {@link useListQuery} takes as it is.
 */
export interface ListQueryState<Filter extends string = string> {
  /** False while a protected view waits for auth, is signed out, or is unavailable. */
  readonly canLoad: boolean
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
 * @param route - The list state, usually `useListRoute(...)` from `@molecule/app-vue`.
 * @param inputs - Plain values, refs or getters; `viewer` is the signed-in user's id,
 *   'anonymous', or null while auth is restoring.
 * @param read - Builds the page's query options, e.g. a generated `articlesPage(...)`.
 * @returns The query state as a ref, as {@link useQuery} returns it.
 */
export function useListQuery<
  T,
  Values extends { viewer: string | null },
  Filter extends string = string,
>(
  route: MaybeRefOrGetter<ListQueryState<Filter>>,
  inputs: ListQueryInputs<Values>,
  read: (values: Values & { viewer: string }, list: ListQueryState<Filter>) => QueryOptions<T>,
): Ref<UseQueryResult<T>> {
  return useQuery<T>(() => {
    const list = toValue(route)
    const values: Partial<Values> = {}
    for (const key of Object.keys(inputs) as (keyof Values)[])
      values[key] = toValue<Values[keyof Values]>(inputs[key])
    const { viewer } = values as Values
    return viewer !== null && list.canLoad ? read({ ...(values as Values), viewer }, list) : null
  })
}
