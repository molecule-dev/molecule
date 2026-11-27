/**
 * Svelte query observer contracts: the same names and shapes as
 * `@molecule/app-query-react`'s, with Svelte's own node and reactivity types.
 *
 * @module
 */
import type { Snippet } from 'svelte'
import type { Readable } from 'svelte/store'

import type { QueryOptions, QueryState } from '@molecule/app-query'

/** What `useQuery` observes: the options for one key or `null` (nothing), as plain values or a store of them. */
export type QueryOptionsInput<T> = QueryOptions<T> | null | Readable<QueryOptions<T> | null>

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

/** What {@link QueryContentProps.children} (the loaded-data branch) receives: the loaded document, as the snippet argument. */
export type QueryContentContext<T> = NonNullable<T>

/** What {@link QueryContentProps.error} receives: the error the failed initial read rejected with. */
export type QueryContentErrorContext = Error

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

  /**
   * State from `useQuery` — as the readable store the hook returns, or as a
   * compatible observer's plain state object. Both follow the query.
   */
  query:
    | Readable<Pick<QueryState<T>, 'data' | 'status' | 'error' | 'isPreviousData'>>
    | Pick<QueryState<T>, 'data' | 'status' | 'error' | 'isPreviousData'>
  /**
   * Stable identity of the requested record, including the principal when needed.
   * Use for record-specific state such as an edit form. Changing the key remounts the
   * loaded branch and excludes data retained from a previous query key.
   */
  recordKey?: PropertyKey
  /** Mounted only with a real document, including false, zero and an empty list. */
  children: Snippet<[QueryContentContext<T>]>
  /** Initial idle/loading content. Render a status snippet, never a fake item or action. */
  pending?: Snippet | null
  /** Content for a loaded null record. Null is distinct from an unfinished request. */
  missing?: Snippet | null
  /** A failed initial read. Cached data stays visible if its refresh fails. */
  error?: Snippet<[QueryContentErrorContext]> | null
}

/**
 * A loaded document and its verified identity, required to render the
 * record's actions.
 */
export interface QueryRecordContentProps<T, Id extends string | number> extends Omit<
  QueryContentProps<T>,
  'children'
> {
  /** Extracts the ID from the loaded document. Null, undefined and an empty string are pending. */
  getRecordId: (data: QueryContentContext<T>) => Id | null | undefined
  /** Receives the ID with the document. The branch remounts when the ID or recordKey changes. */
  children: Snippet<[QueryContentContext<T>, NoInfer<Id>]>
}

/**
 * The content {@link QueryContentProps} renders for each state: the loaded-data branch, the
 * pending and missing content and the error renderer (the snippets the component takes).
 */
export type QueryContentSlots<T> = Pick<
  QueryContentProps<T>,
  'children' | 'pending' | 'missing' | 'error'
>

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
