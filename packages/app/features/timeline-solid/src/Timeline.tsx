import { type Component, For, Show } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import { TimelineEvent } from './TimelineEvent.jsx'
import type { TimelineEventData, TimelineProps } from './types.js'

/**
 * Vertical chronological list of events. Each event renders with a
 * marker + connector on the left (`<TimelineEvent>`). Optional date separators
 * can be inserted by returning a node from `renderDateSeparator`.
 *
 * React keys each row by the event's `id` value, so a re-passed or re-ordered
 * array keeps (and on a reorder, moves) the rendered rows. Solid's `For` keys
 * by reference, so the rows are keyed through stable per-id records: the record
 * for an id is created once and reused, while the row's content reads the
 * CURRENT event for that id reactively (a changed title updates in place).
 *
 * This is the Solid counterpart of `@molecule/app-timeline-react`'s `Timeline`:
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @param props - Component props (see {@link TimelineProps}).
 * @returns The rendered timeline.
 */
export const Timeline: Component<TimelineProps> = (props) => {
  const cm = getClassMap()

  /** One stable record per event id, created on first sight. */
  interface Row {
    id: string
  }
  const records = new Map<string, Row>()
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const rows = props.events.map((event) => {
      seen.add(event.id)
      let row = records.get(event.id)
      if (!row) {
        row = { id: event.id }
        records.set(event.id, row)
      }
      return row
    })
    for (const id of [...records.keys()]) if (!seen.has(id)) records.delete(id)
    return rows
  }
  const eventFor = (id: string): TimelineEventData | undefined =>
    props.events.find((event) => event.id === id)
  const prevFor = (id: string): TimelineEventData | undefined => {
    const index = props.events.findIndex((event) => event.id === id)
    return index > 0 ? props.events[index - 1] : undefined
  }

  return (
    <Show
      when={props.events.length === 0 ? props.emptyState : undefined}
      fallback={
        <div class={cm.cn(cm.stack(0 as const), props.className)}>
          <For each={keyedRows()}>
            {(row, i) => (
              <div>
                {props.renderDateSeparator?.(
                  eventFor(row.id) as TimelineEventData,
                  prevFor(row.id),
                )}
                <TimelineEvent
                  event={eventFor(row.id) as TimelineEventData}
                  isLast={i() === props.events.length - 1}
                />
              </div>
            )}
          </For>
        </div>
      }
    >
      {(empty) => empty()}
    </Show>
  )
}
