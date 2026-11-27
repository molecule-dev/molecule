/**
 * Render resource-dependent content only after its document exists.
 * @module
 */
import { createElement, Fragment, type ReactNode } from 'react'

import type { QueryContentProps, QueryRecordContentProps } from './types.js'

/**
 * The loaded-data branch receives a non-null document. Pending, failed initial reads and
 * missing records never mount that branch, so its actions cannot swallow an early click.
 * Cached data remains mounted during refresh, including a failed refresh. Status fallbacks
 * belong outside the list or record container rendered by `children`, and so does a refresh
 * line; the default fallbacks render nothing.
 * A previous key's empty or missing document renders pending/error until the current key answers.
 * Pass `getRecordId` to bind actions to the loaded document's identity. The branch stays
 * pending without a nonempty ID and receives the ID as its second argument. Use `recordKey`
 * for an edit form or to scope the identified branch to a viewer. Changing either key
 * remounts the branch, including a switch to a record already in cache.
 *
 * @param props - Query state, loaded content and optional status fallbacks.
 * @returns Loaded content or the appropriate fallback.
 */
export function QueryContent<T, Id extends string | number>(
  props: QueryRecordContentProps<T, Id>,
): ReactNode
export function QueryContent<T>(props: QueryContentProps<T>): ReactNode
export function QueryContent<T, Id extends string | number>(
  props: QueryContentProps<T> | QueryRecordContentProps<T, Id>,
): ReactNode {
  const { query, recordKey, pending = null, missing = null, error, empty } = props
  const identified = 'getRecordId' in props
  const data = query.data
  if (
    data === undefined ||
    (query.isPreviousData &&
      (identified || recordKey !== undefined || data === null || empty?.when(data)))
  ) {
    return query.status === 'error' && error
      ? error(query.error ?? new Error('The query failed without an error.'))
      : pending
  }
  if (data === null) return missing
  let content: ReactNode
  if (identified) {
    const id = props.getRecordId(data)
    if (id == null || id === '') return pending
    content = createElement(
      Fragment,
      { key: id },
      empty?.when(data) ? empty.render(data) : props.children(data, id),
    )
  } else {
    content = empty?.when(data) ? empty.render(data) : props.children(data)
  }
  return recordKey === undefined ? content : createElement(Fragment, { key: recordKey }, content)
}
