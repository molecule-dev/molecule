/**
 * Render resource-dependent content only after its document exists — the Solid
 * counterpart of `QueryContent` in `@molecule/app-query-react`, with the same
 * props and the same DOM. The component is headless: it owns no translations
 * and no styling, and renders exactly the chosen branch.
 * @module
 */
import { createMemo, type JSX } from 'solid-js'

import type { QueryContentProps } from './types.js'

/**
 * The loaded-data branch receives a non-null document. Pending, failed initial reads and
 * missing records never mount that branch, so its actions cannot swallow an early click.
 * Cached data remains mounted during refresh, including a failed refresh. Status fallbacks
 * belong outside the list or record container rendered by `children`, and so does a refresh
 * line; the default fallbacks render nothing.
 *
 * @param props - Query state, loaded content and optional status fallbacks.
 * @returns Loaded content or the appropriate fallback, switching as the state changes.
 */
export function QueryContent<T>(props: QueryContentProps<T>): JSX.Element {
  // The branch accessor returns the rendered branch (a node, `null`, or what a
  // render-function prop returned); Solid re-reads it as the state changes.
  const branch = createMemo<JSX.Element>(() => {
    const query = props.query
    const data = query.data
    if (data === undefined) {
      return query.status === 'error' && props.error
        ? props.error(query.error)
        : (props.pending ?? null)
    }
    if (data === null) return props.missing ?? null
    return props.children(data)
  })
  return <>{branch}</>
}
