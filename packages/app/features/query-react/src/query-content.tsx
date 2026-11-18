/**
 * Render resource-dependent content only after its document exists.
 * @module
 */
import { createElement, Fragment, type ReactNode } from 'react'

import type { QueryContentProps } from './types.js'

/**
 * The loaded-data branch receives a non-null document. Pending, failed initial reads and
 * missing records never mount that branch, so its actions cannot swallow an early click.
 * Cached data remains mounted during refresh, including a failed refresh. Status fallbacks
 * belong outside the list or record container rendered by `children`, and so does a refresh
 * line; the default fallbacks render nothing.
 * A previous key's empty or missing document renders pending/error until the current key answers.
 * Pass `recordKey` for an edit form. The form mounts with the current record and resets when
 * its identity changes, including a switch to a record already in cache.
 *
 * @param props - Query state, loaded content and optional status fallbacks.
 * @returns Loaded content or the appropriate fallback.
 */
export function QueryContent<T>({
  query,
  children,
  recordKey,
  pending = null,
  missing = null,
  error,
  empty,
}: QueryContentProps<T>): ReactNode {
  const data = query.data
  if (
    data === undefined ||
    (query.isPreviousData && (recordKey !== undefined || data === null || empty?.when(data)))
  ) {
    return query.status === 'error' && error ? error(query.error) : pending
  }
  if (data === null) return missing
  const content = empty?.when(data) ? empty.render(data) : children(data)
  return recordKey === undefined ? content : createElement(Fragment, { key: recordKey }, content)
}
