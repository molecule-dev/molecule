/**
 * Solid flat activity feed: a stack of activity rows with an optional empty
 * state and footer.
 *
 * Solid counterpart of `@molecule/app-activity-feed-react`'s `ActivityFeed` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { type Component, For, type JSX, Show } from 'solid-js'

import { ResolveNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { ActivityFeedItem } from './ActivityFeedItem.jsx'
import type { ActivityFeedItemData, ActivityFeedProps } from './types.js'

/**
 * Simple activity feed — renders each item via `<ActivityFeedItem>` and stacks
 * them. With no items and an empty state, React renders the empty state alone;
 * for date-grouped feeds use `<ActivityFeedGroup>`.
 *
 * React keys each row by the item's `id` value, so a re-passed or re-ordered
 * array keeps the rendered rows per id. Solid's `For` keys by reference, so the
 * rows are keyed through stable per-id records: the record for an id is created
 * once and reused, while the row's content reads the CURRENT item for that id
 * reactively.
 *
 * @param props - Component props (see {@link ActivityFeedProps}).
 * @returns The rendered activity feed.
 */
export const ActivityFeed: Component<ActivityFeedProps> = (props) => {
  const cm = getClassMap()

  /** One stable record per item id, created on first sight. */
  interface Row {
    id: string
  }
  const records = new Map<string, Row>()
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const rows = props.items.map((item) => {
      seen.add(item.id)
      let row = records.get(item.id)
      if (!row) {
        row = { id: item.id }
        records.set(item.id, row)
      }
      return row
    })
    for (const id of [...records.keys()]) if (!seen.has(id)) records.delete(id)
    return rows
  }
  const itemFor = (id: string): ActivityFeedItemData =>
    props.items.find((item) => item.id === id) as ActivityFeedItemData

  const list = (): JSX.Element => (
    <div class={cm.cn(cm.stack(4), props.className)}>
      <For each={keyedRows()}>
        {(row): JSX.Element => <ActivityFeedItem item={itemFor(row.id)} />}
      </For>
      {props.footer}
    </div>
  )

  return (
    <Show when={props.items.length === 0} fallback={list()}>
      <ResolveNode node={props.emptyState}>
        {(empty, hasEmpty) => (
          <Show when={hasEmpty()} fallback={list()}>
            {empty()}
          </Show>
        )}
      </ResolveNode>
    </Show>
  )
}
