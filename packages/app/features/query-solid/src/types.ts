/**
 * Solid query observer contracts — the counterparts of the types
 * `@molecule/app-query-react` exports, with the node-valued props typed as
 * Solid `JSX`.
 * @module
 */
import type { Accessor, JSX } from 'solid-js'

import type { QueryState } from '@molecule/app-query'

/**
 * A mounted query's state and its explicit cache and refresh actions. The state
 * fields read as plain values at read time (each reads the observer's current
 * state), so a JSX binding that reads them re-renders when the document
 * changes, and a test can snapshot the object at any moment.
 */
export interface UseQueryResult<T> extends QueryState<T> {
  /**
   * Publish a saved document to this key and all its observers. Render `data`
   * directly instead of copying it to local state: later cache updates then
   * remain visible. A function receives this key's current cached document,
   * never retained previous-page data. Returning `undefined` leaves the cache
   * unchanged. A disabled (`null`) query does nothing, including not calling an
   * updater. Like React state setters, wrap a function-valued document in an
   * updater. A saved callback stays bound to its original key. The write
   * supersedes older in-flight reads, using the bonded client's `set` contract.
   */
  setData: (value: T | ((previous: T | undefined) => T | undefined)) => void
  /**
   * Fetch this key again, even when its cached document is fresh. Observers
   * receive the updated state. Resolves with that state, including an error
   * when the request fails; a disabled (`null`) query resolves idle without a
   * request.
   */
  refetch: () => Promise<QueryState<T>>
}

/** A loaded document owns its controls; absent documents expose only status content. */
export interface QueryContentProps<T> {
  /**
   * One optional empty branch, exclusive with children. The pure predicate reads the
   * loaded document (an array or an application-owned envelope); render selects the
   * current view's message and recovery action. A previous key's empty document uses
   * pending/error instead. Omit it to keep empty arrays as data.
   */
  empty?: {
    when: (data: NonNullable<T>) => boolean
    render: NonNullable<QueryContentProps<T>['children']>
  }

  /** State from useQuery, or any compatible query observer. */
  query: Pick<QueryState<T>, 'data' | 'status' | 'error' | 'isPreviousData'>
  /**
   * Mounted only with a real document, including false, zero and an empty list. Runs once
   * per loaded stretch with the document as an accessor (Solid's `<Show>` idiom): a new
   * document reaches the same mounted content, so read it where it is used (`data()`).
   */
  children: (data: Accessor<NonNullable<T>>) => JSX.Element
  /** Initial idle/loading content. Render a status node, never a fake item or action. */
  pending?: JSX.Element
  /** Content for a loaded null record. Null is distinct from an unfinished request. */
  missing?: JSX.Element
  /** A failed initial read. Cached data stays visible if its refresh fails. */
  error?: (error: unknown) => JSX.Element
}
