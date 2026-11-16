/**
 * Svelte query observer contracts: the same names and shapes as
 * `@molecule/app-query-react`'s, with Svelte's own node and reactivity types.
 *
 * @module
 */
import type { Snippet } from 'svelte'
import type { Readable } from 'svelte/store'

import type { QueryState } from '@molecule/app-query'

/**
 * A mounted query's state and its explicit cache and refresh actions. The
 * Svelte hook hands this out as a readable store of these objects (one per
 * change), so a component reads `data` and `status` with `$result.data`.
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
   * current view's message and recovery action. Omit it to keep empty arrays as data.
   */
  empty?: {
    when: (data: NonNullable<T>) => boolean
    render: NonNullable<QueryContentProps<T>['children']>
  }

  /**
   * State from `useQuery` — as the readable store the hook returns, or as a
   * compatible observer's plain state object. Both follow the query.
   */
  query:
    | Readable<Pick<QueryState<T>, 'data' | 'status' | 'error'>>
    | Pick<QueryState<T>, 'data' | 'status' | 'error'>
  /** Mounted only with a real document, including false, zero and an empty list. */
  children: Snippet<[NonNullable<T>]>
  /** Initial idle/loading content. Render a status snippet, never a fake item or action. */
  pending?: Snippet | null
  /** Content for a loaded null record. Null is distinct from an unfinished request. */
  missing?: Snippet | null
  /** A failed initial read. Cached data stays visible if its refresh fails. */
  error?: Snippet<[unknown]> | null
}

/**
 * The handlers {@link intentPrefetchProps} returns, in Svelte 5's listener
 * naming (lowercase DOM event attributes, spreadable onto an `<a>`).
 */
export interface IntentPrefetchProps {
  /** Warms the document when the pointer arrives. */
  onpointerenter: () => void
  /** Warms the document on keyboard focus. */
  onfocus: () => void
  /** Warms the document when a touch starts. */
  ontouchstart: () => void
}
