/**
 * React query observer contracts.
 * @module
 */
import type { ReactNode } from 'react'

import type { QueryState } from '@molecule/app-query'

/** A mounted query's state and its explicit cache and refresh actions. */
export interface UseQueryResult<T> extends QueryState<T> {
  /**
   * Publish a saved document to this key and all its observers. Render `data` directly
   * instead of copying it to local state: later cache updates then remain visible.
   * A function receives this key's current cached document, never retained previous-page
   * data. Returning `undefined` leaves the cache unchanged. A disabled (`null`) query
   * does nothing, including not calling an updater. Like React state setters, wrap a
   * function-valued document in an updater. A saved callback stays bound to its original key.
   * The write supersedes older in-flight reads, using the bonded client's `set` contract.
   */
  setData: (value: T | ((previous: T | undefined) => T | undefined)) => void
  /**
   * Fetch this key again, even when its cached document is fresh. Observers receive the
   * updated state. Resolves with that state, including an error when the request fails;
   * a disabled (`null`) query resolves idle without a request.
   */
  refetch: () => Promise<QueryState<T>>
}

/** A loaded document owns its controls; absent documents expose only status content. */
export interface QueryContentProps<T> {
  /** State from useQuery, or any compatible query observer. */
  query: Pick<QueryState<T>, 'data' | 'status' | 'error'>
  /** Mounted only with a real document, including false, zero and an empty list. */
  children: (data: NonNullable<T>) => ReactNode
  /** Initial idle/loading content. Render a status node, never a fake item or action. */
  pending?: ReactNode
  /** Content for a loaded null record. Null is distinct from an unfinished request. */
  missing?: ReactNode
  /** A failed initial read. Cached data stays visible if its refresh fails. */
  error?: (error: unknown) => ReactNode
}
