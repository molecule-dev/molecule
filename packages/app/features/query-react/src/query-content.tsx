/**
 * Render resource-dependent content only after its document exists.
 * @module
 */
import type { ReactNode } from 'react'

import type { QueryContentProps } from './types.js'

/**
 * The loaded-data branch receives a non-null document. Pending, failed initial reads and
 * missing records never mount that branch, so its actions cannot swallow an early click.
 * Cached data remains mounted during refresh, including a failed refresh. Status fallbacks
 * belong outside the list or record container rendered by `children`, and so does a refresh
 * line; the default fallbacks render nothing.
 *
 * @param props - Query state, loaded content and optional status fallbacks.
 * @returns Loaded content or the appropriate fallback.
 */
export function QueryContent<T>({
  query,
  children,
  pending = null,
  missing = null,
  error,
}: QueryContentProps<T>): ReactNode {
  if (query.data === undefined) {
    return query.status === 'error' && error ? error(query.error) : pending
  }
  if (query.data === null) return missing
  return children(query.data)
}
