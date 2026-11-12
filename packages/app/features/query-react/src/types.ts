/**
 * React query observer contracts.
 * @module
 */
import type { QueryState } from '@molecule/app-query'

/** A mounted query's state and its explicit refresh action. */
export interface UseQueryResult<T> extends QueryState<T> {
  /**
   * Fetch this key again, even when its cached document is fresh. Observers receive the
   * updated state. Resolves with that state, including an error when the request fails;
   * a disabled (`null`) query resolves idle without a request.
   */
  refetch: () => Promise<QueryState<T>>
}
