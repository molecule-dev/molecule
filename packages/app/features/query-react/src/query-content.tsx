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
 * A previous key's empty or missing document renders pending/error until the current key answers.
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
  empty,
}: QueryContentProps<T>): ReactNode {
  const data = query.data
  if (data === undefined || (query.isPreviousData && (data === null || empty?.when(data)))) {
    return query.status === 'error' && error ? error(query.error) : pending
  }
  if (data === null) return missing
  if (empty?.when(data)) return empty.render(data)
  return children(data)
}
