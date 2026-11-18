/**
 * Angular query observer contracts — the counterparts of the types
 * `@molecule/app-query-react` exports, with the node-valued props typed as
 * Angular `TemplateRef`s.
 * @module
 */
import type { Signal, TemplateRef } from '@angular/core'

import type { QueryOptions, QueryState } from '@molecule/app-query'

/** What `useQuery` observes: the options for one key or `null` (nothing), as plain values or a signal of them. */
export type QueryOptionsInput<T> = QueryOptions<T> | null | Signal<QueryOptions<T> | null>

/**
 * A mounted query's state and its explicit cache and refresh actions. The state
 * fields read as plain values at read time (each reads the observer's current
 * state signal), so a template binding that calls them re-renders when the
 * document changes, and a test can snapshot the object at any moment.
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

/**
 * The context a children template receives: the loaded, non-null document, as
 * `$implicit` and as the render function's first argument (`a0`).
 *
 * @template T - The document's shape.
 */
export interface QueryContentContext<T> {
  /** The loaded document (never `undefined` or `null`). */
  $implicit: NonNullable<T>
  /** The same document, as the first render argument. */
  a0: NonNullable<T>
}

/**
 * The context a record-bound children template receives: the loaded document
 * as `$implicit`/`a0`, and its verified identity as `a1`.
 *
 * @template T - The document's shape.
 * @template Id - The identity's type.
 */
interface QueryRecordContentContext<T, Id extends string | number> extends QueryContentContext<T> {
  /** The document's verified, nonempty identity (the second render argument). */
  a1: Id
}

/**
 * The context an error template receives: the failed read's error value, as
 * `$implicit` and as the render function's first argument (`a0`).
 */
export interface QueryContentErrorContext {
  /** The error the failed read rejected with. */
  $implicit: unknown
  /** The same error, as the first render argument. */
  a0: unknown
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
   * Stable identity of the requested record, including the principal when needed.
   * Use for record-specific state such as an edit form. Changing the key remounts the
   * loaded branch and excludes data retained from a previous query key.
   */
  recordKey?: PropertyKey
  /** Mounted only with a real document, including false, zero and an empty list. */
  children: TemplateRef<QueryContentContext<T>> | null
  /** Initial idle/loading content. Render a status template, never a fake item or action. */
  pending?: TemplateRef<unknown> | null
  /** Content for a loaded null record. Null is distinct from an unfinished request. */
  missing?: TemplateRef<unknown> | null
  /** A failed initial read. Cached data stays visible if its refresh fails. */
  error?: TemplateRef<QueryContentErrorContext> | null
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
  getRecordId: (data: QueryContentContext<T>['$implicit']) => Id | null | undefined
  /** Receives the ID with the document. The branch remounts when the ID or recordKey changes. */
  children: TemplateRef<QueryRecordContentContext<T, NoInfer<Id>>> | null
}

/**
 * The content {@link QueryContentProps} renders for each state: the loaded-data branch, the
 * pending and missing content and the error renderer (the templates the component takes as inputs).
 */
export type QueryContentSlots<T> = Pick<
  QueryContentProps<T>,
  'children' | 'pending' | 'missing' | 'error'
>
