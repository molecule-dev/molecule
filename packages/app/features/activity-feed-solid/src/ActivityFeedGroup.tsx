/**
 * Solid date-grouped activity section: a heading followed by a stack of rows.
 *
 * Solid counterpart of `@molecule/app-activity-feed-react`'s
 * `ActivityFeedGroup` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import { type Component, For, type JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import { ActivityFeedItem } from './ActivityFeedItem.jsx'
import type { ActivityFeedGroupProps, ActivityFeedItemData } from './types.js'

/**
 * Date-grouped activity section — a heading followed by a stack of items.
 * Compose multiple groups together for an organized "Today / Yesterday / Last
 * week" feed.
 *
 * React keys each row by the item's `id` value, so the rows are keyed through
 * stable per-id records here for the same DOM survival across a re-passed or
 * re-ordered array.
 *
 * @param props - Component props (see {@link ActivityFeedGroupProps}).
 * @returns The rendered activity group.
 */
export const ActivityFeedGroup: Component<ActivityFeedGroupProps> = (props) => {
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

  return (
    <section class={cm.cn(cm.stack(3), props.className)}>
      <h3 class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{props.heading}</h3>
      <div class={cm.stack(4)}>
        <For each={keyedRows()}>
          {(row): JSX.Element => <ActivityFeedItem item={itemFor(row.id)} />}
        </For>
      </div>
    </section>
  )
}
