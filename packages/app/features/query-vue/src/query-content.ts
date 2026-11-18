/**
 * Render resource-dependent content only after its document exists.
 * @module
 */
import { Fragment, h, type VNodeChild } from 'vue'

import type { QueryContentProps, QueryRecordContentProps } from './types.js'

/**
 * Wraps the loaded branch in a keyed fragment, so a changed `recordKey` starts
 * the branch fresh (React's `createElement(Fragment, { key: recordKey }, content)`).
 *
 * @param key - The record identity, or `undefined` to keep the branch in place.
 * @param content - The loaded branch.
 * @returns The keyed branch, or the branch itself without a record key.
 */
function withRecordKey(key: PropertyKey | undefined, content: VNodeChild): VNodeChild {
  return key === undefined ? content : h(Fragment, { key }, [content])
}

/**
 * The slots {@link QueryContent} accepts alongside its props: every node-valued
 * prop also arrives as a same-named slot, and `children` as the default slot.
 */
export interface QueryContentSlots<T> {
  /** The loaded-data branch, which receives `{ data }` (the document). */
  default?: (slotProps: { data: NonNullable<T> }) => VNodeChild
  /** Idle/loading content (the `pending` prop). */
  pending?: () => VNodeChild
  /** Loaded-null content (the `missing` prop). */
  missing?: () => VNodeChild
}

/**
 * The loaded-data branch receives a non-null document. Pending, failed initial
 * reads and missing records never mount that branch, so its actions cannot
 * swallow an early click. Cached data remains mounted during refresh, including
 * a failed refresh. Status fallbacks belong outside the list or record
 * container rendered by `children`, and so does a refresh line; the default
 * fallbacks render nothing.
 * A previous key's empty or missing document renders pending/error until the current key answers.
 * Pass `recordKey` for an edit form. The form mounts with the current record and resets when
 * its identity changes, including a switch to a record already in cache.
 * Pass `getRecordId` to bind actions to the loaded document's identity. The branch stays
 * pending without a nonempty ID and receives the ID as its second argument. Changing either
 * key remounts the branch, including a switch to a record already in cache.
 *
 * The loaded branch is the `children` render function, or the default slot
 * (which receives `{ data }`); `pending` and `missing` are node props or
 * same-named slots. It is the Vue counterpart of `@molecule/app-query-react`'s
 * `QueryContent`: the same props, the same branch rules, and the same DOM for
 * the same input. Use it with `h(QueryContent, { query, children, … })` — the
 * document's type flows from the `query` prop into `children`.
 *
 * @param props - Query state, loaded content and optional status fallbacks.
 * @param ctx - The functional-component context; its slots carry the same-named
 *   alternatives to the node props and the default slot for `children`.
 * @returns Loaded content or the appropriate fallback.
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { QueryContent } from '@molecule/app-query-vue'
 *
 * export const RecordRegion = defineComponent({
 *   props: { query: { type: Object, required: true } },
 *   setup(props) {
 *     return () =>
 *       h(QueryContent, {
 *         query: props.query,
 *         pending: h('p', { role: 'status' }, 'Loading…'),
 *         missing: h('p', {}, 'Not found'),
 *         error: (cause) => h('p', { role: 'alert' }, `Failed: ${String(cause)}`),
 *         children: (record) => h('article', {}, record.name),
 *       })
 *   },
 * })
 * ```
 */
export const QueryContent = Object.assign(
  function QueryContent<T, Id extends string | number = string | number>(
    props: QueryContentProps<T> | QueryRecordContentProps<T, Id>,
    ctx: { slots: QueryContentSlots<T> },
  ): VNodeChild {
    const { query, recordKey, pending, missing, error, empty } = props
    // Vue keeps every declared prop on the props object, so the presence test is the value's type.
    const identified = typeof (props as { getRecordId?: unknown }).getRecordId === 'function'
    const data = query.data
    if (
      data === undefined ||
      (query.isPreviousData &&
        (identified || recordKey !== undefined || data === null || empty?.when(data)))
    ) {
      if (query.status === 'error' && error) return error(query.error)
      return pending ?? ctx.slots.pending?.() ?? null
    }
    if (data === null) return missing ?? ctx.slots.missing?.() ?? null
    if (identified) {
      const record = props as QueryRecordContentProps<T, Id>
      const id = record.getRecordId(data)
      // No identity means no record-specific action: the branch stays pending.
      if (id == null || id === '') return pending ?? ctx.slots.pending?.() ?? null
      const content = empty?.when(data)
        ? (empty.render?.(data) ?? null)
        : (record.children(data, id) ?? null)
      return withRecordKey(recordKey, h(Fragment, { key: id }, [content]))
    }
    const plain = props as QueryContentProps<T>
    if (empty?.when(data)) return withRecordKey(recordKey, empty.render?.(data) ?? null)
    if (plain.children) return withRecordKey(recordKey, plain.children(data))
    return withRecordKey(recordKey, ctx.slots.default?.({ data }) ?? null)
  },
  // Declared so Vue extracts these from attrs instead of inheriting them onto
  // whatever the branches render.
  {
    props: [
      'query',
      'children',
      'pending',
      'missing',
      'error',
      'empty',
      'recordKey',
      'getRecordId',
    ],
  },
)
