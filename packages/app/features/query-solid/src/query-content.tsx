/**
 * Render resource-dependent content only after its document exists — the Solid
 * counterpart of `QueryContent` in `@molecule/app-query-react`, with the same
 * props and the same DOM. The component is headless: it owns no translations
 * and no styling, and renders exactly the chosen branch.
 * @module
 */
import { createMemo, type JSX, Show } from 'solid-js'

import type { QueryContentProps } from './types.js'

/**
 * The loaded-data branch receives a non-null document. Pending, failed initial reads and
 * missing records never mount that branch, so its actions cannot swallow an early click.
 * Cached data remains mounted during refresh, including a failed refresh. Status fallbacks
 * belong outside the list or record container rendered by `children`, and so does a refresh
 * line; the default fallbacks render nothing.
 * A previous key's empty or missing document renders pending/error until the current key answers.
 *
 * `children` runs ONCE per loaded stretch and receives the document as an accessor (Solid's
 * `<Show>` idiom), so a new document — a cache publication, a refresh, another key's record —
 * reaches the SAME mounted content, the way React re-renders the same components with it:
 * their local state (an optimistic toggle's pending save, an open menu) survives. Read the
 * accessor where the value is used: `{(invoice) => <FlagButton invoice={invoice()} />}`.
 *
 * @param props - Query state, loaded content and optional status fallbacks.
 * @returns Loaded content or the appropriate fallback, switching as the state changes.
 */
export function QueryContent<T>(props: QueryContentProps<T>): JSX.Element {
  // Boxed, so a loaded `false`, `0` or `''` is still a truthy `when` for <Show>.
  const loaded = createMemo(() => {
    const data = props.query.data
    return data === undefined || data === null || props.empty?.when(data) ? undefined : { data }
  })
  // Rendered only while nothing is loaded: a failed REFRESH of cached data never calls `error`.
  const fallback = createMemo<JSX.Element>(() => {
    const query = props.query
    const data = query.data
    if (
      data === undefined ||
      (query.isPreviousData && (data === null || props.empty?.when(data)))
    ) {
      return query.status === 'error' && props.error
        ? props.error(query.error)
        : (props.pending ?? null)
    }
    if (data === null) return props.missing ?? null
    if (data !== undefined)
      return props.empty?.when(data) ? props.empty.render(() => props.query.data!) : null
    return null
  })
  return (
    <Show when={loaded()} fallback={fallback()}>
      {(box) => props.children(() => box().data)}
    </Show>
  )
}
