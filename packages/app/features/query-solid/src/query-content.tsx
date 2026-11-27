/**
 * Render resource-dependent content only after its document exists — the Solid
 * counterpart of `QueryContent` in `@molecule/app-query-react`, with the same
 * props and the same DOM. The component is headless: it owns no translations
 * and no styling, and renders exactly the chosen branch.
 * @module
 */
import { createEffect, createMemo, createSignal, type JSX, Show } from 'solid-js'

import type { QueryContentProps, QueryRecordContentProps } from './types.js'

/**
 * The loaded-data branch receives a non-null document. Pending, failed initial reads and
 * missing records never mount that branch, so its actions cannot swallow an early click.
 * Cached data remains mounted during refresh, including a failed refresh. Status fallbacks
 * belong outside the list or record container rendered by `children`, and so does a refresh
 * line; the default fallbacks render nothing.
 * A previous key's empty or missing document renders pending/error until the current key answers.
 * Pass `recordKey` for an edit form. The form mounts with the current record and resets when
 * its identity changes, including a switch to a record already in cache.
 * Pass `getRecordId` to bind actions to the loaded document's identity. The branch stays
 * pending without a nonempty ID and receives the ID as its second argument. Changing either
 * key remounts the branch, including a switch to a record already in cache.
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
export function QueryContent<T, Id extends string | number>(
  props: QueryRecordContentProps<T, Id>,
): JSX.Element
export function QueryContent<T>(props: QueryContentProps<T>): JSX.Element
export function QueryContent<T, Id extends string | number = string | number>(
  props: QueryContentProps<T> | QueryRecordContentProps<T, Id>,
): JSX.Element {
  // Solid's props object carries only the props that were passed, so the presence
  // test agrees with the value's type. Either shape is kept as a narrowed local so
  // `children` is called with the arguments its own shape declares.
  const record = 'getRecordId' in props && typeof props.getRecordId === 'function' ? props : null
  const plain = 'getRecordId' in props ? null : props
  const identified = record !== null
  /** The valid identity of the loaded document: absent, null and '' are pending. */
  const recordId = createMemo<Id | undefined>(() => {
    if (!record) return undefined
    const data = props.query.data
    if (data === undefined || data === null) return undefined
    const id = record.getRecordId(data)
    return id == null || id === '' ? undefined : id
  })
  // The record the loaded branch is mounted with. It follows `recordKey` in an
  // effect rather than reading the prop directly: the page's own `useQuery`
  // effect (created before this component) applies the new key's state in the
  // same flush, so the branch remounts with THAT key's record — the way React
  // mounts it in the render where the key and the query's state commit together.
  const [mountedRecord, setMountedRecord] = createSignal(props.recordKey)
  createEffect(() => {
    setMountedRecord(props.recordKey)
  })
  // Boxed, so a `0` ID is a truthy key for <Show>; the memo keeps one object per
  // ID and viewer, so `keyed` remounts on a changed ID or record key and only then.
  const recordIdBox = createMemo(() => {
    const id = recordId()
    return id === undefined ? undefined : { id, recordKey: mountedRecord() }
  })
  // Boxed, so a loaded `false`, `0` or `''` is still a truthy `when` for <Show>.
  const loaded = createMemo(() => {
    const data = props.query.data
    return data === undefined ||
      data === null ||
      (props.query.isPreviousData === true && (identified || props.recordKey !== undefined)) ||
      props.empty?.when(data) ||
      (identified && recordId() === undefined)
      ? undefined
      : { data }
  })
  // Rendered only while nothing is loaded: a failed REFRESH of cached data never calls `error`.
  const fallback = createMemo<JSX.Element>(() => {
    const query = props.query
    const data = query.data
    if (
      data === undefined ||
      (query.isPreviousData &&
        (identified || props.recordKey !== undefined || data === null || props.empty?.when(data)))
    ) {
      return query.status === 'error' && props.error
        ? props.error(query.error ?? new Error('The query failed without an error.'))
        : (props.pending ?? null)
    }
    if (data === null) return props.missing ?? null
    // A document without a verified identity keeps the record branch unmounted.
    if (identified) return recordId() === undefined ? (props.pending ?? null) : null
    if (data !== undefined)
      return props.empty?.when(data) ? props.empty.render(() => props.query.data!) : null
    return null
  })
  return (
    <Show when={loaded()} fallback={fallback()}>
      {(box) =>
        record ? (
          // Keyed by the document's own identity, so a changed ID remounts the branch
          // with the new record's state, the way React's keyed Fragment does.
          <Show
            when={recordIdBox()}
            keyed
            fallback={record.children(() => box().data, recordId()!)}
          >
            {(key) => record.children(() => box().data, key.id)}
          </Show>
        ) : plain ? (
          // `keyed` remounts the loaded branch when the record changes, the way React's
          // keyed Fragment does; without a record key the branch stays mounted across
          // documents (and a `0`/`''` key still renders its branch through the fallback).
          <Show when={mountedRecord()} keyed fallback={plain.children(() => box().data)}>
            {plain.children(() => box().data)}
          </Show>
        ) : null
      }
    </Show>
  )
}
