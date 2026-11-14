/**
 * Prefetching one document ahead of a navigation, framework-neutral: every framework's query
 * package (`@molecule/app-query-react`, `-vue`, …) re-exports {@link prefetchQuery} and builds
 * its `usePrefetch` and `intentPrefetchProps` on it.
 *
 * @module
 */

import { shouldPrefetch } from './network.js'
import { getQueryClient } from './provider.js'
import type { QueryOptions } from './types.js'

/**
 * Warms the cache for a document, when the connection can afford it (see
 * `shouldPrefetch()` in the core). Safe to call repeatedly: a fresh or
 * in-flight document is skipped, and failures are swallowed.
 *
 * @param options - Key, fetch, freshness.
 */
export function prefetchQuery<T>(options: QueryOptions<T>): void {
  if (!shouldPrefetch()) return
  getQueryClient().prefetch(options)
}
