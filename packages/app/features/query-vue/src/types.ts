/**
 * Vue query observer contracts.
 *
 * The Vue counterpart of `@molecule/app-query-react`'s types: the same names
 * and the same plain state fields, with node-valued props typed as Vue's
 * `VNodeChild`. {@link useQuery} returns the result wrapped in a `Ref`, so
 * templates auto-unwrap it and reactive updates re-render.
 *
 * @module
 */
import type { MaybeRefOrGetter, VNodeChild } from 'vue'

import type { QueryOptions, QueryState } from '@molecule/app-query'

/**
 * A mounted query's state and its explicit cache and refresh actions.
 */
export interface UseQueryResult<T> extends QueryState<T> {
  /**
   * Publish a saved document to this key and all its observers. Render `data`
   * directly instead of copying it to a local ref: later cache updates then
   * remain visible. A function receives this key's current cached document,
   * never retained previous-page data. Returning `undefined` leaves the cache
   * unchanged. A disabled (`null`) query does nothing, including not calling an
   * updater. Like Vue's reactive writes, an updater runs against the cache as
   * it is when the call lands. A saved callback stays bound to its original
   * key. The write supersedes older in-flight reads, using the bonded client's
   * `set` contract.
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

/**
 * What {@link QueryContentProps.children} (the loaded-data branch) receives: the loaded
 * document (the default slot receives it as `{ data }`).
 */
export type QueryContentContext<T> = NonNullable<T>

/** What {@link QueryContentProps.error} receives: the error the failed initial read rejected with. */
export type QueryContentErrorContext = unknown

/**
 * A loaded document owns its controls; absent documents expose only status
 * content.
 */
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
   * Mounted only with a real document, including false, zero and an empty
   * list. A render function (React's render-prop name) or the default slot,
   * which receives the document as its scoped-slot prop `{ data }`.
   */
  children: (data: QueryContentContext<T>) => VNodeChild
  /** Initial idle/loading content. Render a status node, never a fake item or action. */
  pending?: VNodeChild
  /** Content for a loaded null record. Null is distinct from an unfinished request. */
  missing?: VNodeChild
  /** A failed initial read. Cached data stays visible if its refresh fails. */
  error?: (error: QueryContentErrorContext) => VNodeChild
}

/**
 * What {@link useQuery} observes: the same options object React's hook takes,
 * or a ref/getter of one. Passing a ref or getter lets one mounted composable
 * follow a changed key on the SAME instance — the Vue counterpart of React
 * re-rendering `useQuery` with a new options object.
 */
export type QueryOptionsInput<T> = MaybeRefOrGetter<QueryOptions<T> | null>
