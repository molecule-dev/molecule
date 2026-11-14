/**
 * `useListQuery`: one cached read driven by a URL list route.
 *
 * @module
 */
import { derived, type Readable, readable } from 'svelte/store'

import type { QueryOptions } from '@molecule/app-query'

import type { UseQueryResult } from './types.js'
import { useQuery } from './useQuery.js'

/** A plain value or a readable store: each input {@link useListQuery} reads reactively. */
export type ListQuerySource<T> = T | Readable<T>

/** Each input of {@link useListQuery} as a {@link ListQuerySource}. */
export type ListQueryInputs<Values> = {
  readonly [Key in keyof Values]: ListQuerySource<Values[Key]>
}

/**
 * The list route a list query reads: `useListRoute` from `@molecule/app-svelte` returns these
 * stores (and more), so its result is passed as it is.
 */
export interface ListQueryRoute<Filter extends string = string> {
  /** False while a protected view waits for auth, is signed out, or is unavailable. */
  readonly canLoad: Readable<boolean>
  /** The current URL filter values. */
  readonly filters: Readable<Readonly<Record<Filter, string | undefined>>>
  /** The configured items per page. */
  readonly pageSize: Readable<number>
  /** The zero-indexed item offset for the API request. */
  readonly offset: Readable<number>
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
 * Whether an argument is a readable store (an object with `subscribe`) rather than a value.
 *
 * @param source - The argument as the caller passed it.
 * @returns True for a store.
 */
const isStore = <T>(source: ListQuerySource<T>): source is Readable<T> =>
  typeof source === 'object' &&
  source !== null &&
  typeof (source as { subscribe?: unknown }).subscribe === 'function'

/**
 * The store view of an argument: the store itself, or a constant store of the value.
 *
 * @param source - The argument as the caller passed it.
 * @returns A readable store of it.
 */
const toStore = <T>(source: ListQuerySource<T>): Readable<T> =>
  isStore(source) ? source : readable(source)

/**
 * Observe the page a URL list route points at. `read` builds the query from the current value of
 * each input (the signed-in `viewer`, request params, a parent record's id) and the route's
 * filters, page size and offset. The query is disabled (`null`, no request) while `viewer` is
 * null (auth is still being restored) or the route cannot load yet; a changed input or URL moves
 * the same observer to the new page.
 * Call it during component initialisation, as {@link useQuery}.
 *
 * @param route - The list route, usually `useListRoute(...)` from `@molecule/app-svelte`.
 * @param inputs - Plain values or stores; `viewer` is the signed-in user's id, 'anonymous',
 *   or null while auth is restoring.
 * @param read - Builds the page's query options, e.g. a generated `articlesPage(...)`.
 * @returns The query state as a store, as {@link useQuery} returns it.
 */
export function useListQuery<
  T,
  Values extends { viewer: string | null },
  Filter extends string = string,
>(
  route: ListQueryRoute<Filter>,
  inputs: ListQueryInputs<Values>,
  read: (values: Values & { viewer: string }, list: ListQueryState<Filter>) => QueryOptions<T>,
): Readable<UseQueryResult<T>> {
  const keys = Object.keys(inputs) as (keyof Values)[]
  const values = derived(
    keys.map((key) => toStore<Values[keyof Values]>(inputs[key])),
    (current): Values => {
      const next: Partial<Values> = {}
      keys.forEach((key, index) => {
        next[key] = current[index]
      })
      return next as Values
    },
  )
  return useQuery<T>(
    derived(
      [values, route.canLoad, route.filters, route.pageSize, route.offset],
      ([current, canLoad, filters, pageSize, offset]): QueryOptions<T> | null =>
        current.viewer !== null && canLoad
          ? read({ ...current, viewer: current.viewer }, { filters, pageSize, offset })
          : null,
    ),
  )
}
