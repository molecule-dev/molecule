/**
 * Angular query observer contracts — the counterparts of the types
 * `@molecule/app-query-react` exports, with the node-valued props typed as
 * Angular `TemplateRef`s.
 * @module
 */
import type { TemplateRef } from '@angular/core'

import type { QueryState } from '@molecule/app-query'

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
  /** State from useQuery, or any compatible query observer. */
  query: Pick<QueryState<T>, 'data' | 'status' | 'error'>
  /** Mounted only with a real document, including false, zero and an empty list. */
  children: TemplateRef<QueryContentContext<T>> | null
  /** Initial idle/loading content. Render a status template, never a fake item or action. */
  pending?: TemplateRef<unknown> | null
  /** Content for a loaded null record. Null is distinct from an unfinished request. */
  missing?: TemplateRef<unknown> | null
  /** A failed initial read. Cached data stays visible if its refresh fails. */
  error?: TemplateRef<QueryContentErrorContext> | null
}
