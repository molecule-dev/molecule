/**
 * Solid vertical activity timeline with connector line and dot markers.
 *
 * Solid counterpart of `@molecule/app-activity-timeline-react`'s
 * `ActivityTimeline` — the same props (React names), the same DOM for the same
 * input.
 *
 * @module
 */

import { type Component, For, type JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import { ActivityTimelineRow } from './ActivityTimelineRow.jsx'
import type { TimelineEventData, TimelineKindTone } from './types.js'

/** The tone an event gets when neither the map nor the default lists its kind. */
const FALLBACK_TONE: TimelineKindTone = {
  icon: 'event',
}

/** Props accepted by the {@link ActivityTimeline} component. */
interface ActivityTimelineProps {
  /** The events to stack, in display order. */
  events: TimelineEventData[]
  /** Visual treatment per event kind. Falls back to a generic dot for unknown kinds. */
  toneByKind?: Record<string, TimelineKindTone>
  /** Default tone applied when `toneByKind` doesn't list the event's kind. */
  defaultTone?: TimelineKindTone
  /** Wrap each row (e.g. with a router link). Receives the per-event data. */
  rowWrapper?: (event: TimelineEventData, children: JSX.Element) => JSX.Element
  /** Slot rendered above the timeline (heading, filters, etc.). */
  header?: JSX.Element
  /** Slot rendered below the timeline (load-more link, footer chips, etc.). */
  footer?: JSX.Element
  /** Extra classes on the panel. */
  className?: string
}

/**
 * Stack events vertically with a connector line and per-kind dot
 * markers. Compose with `header`/`footer` slots or pass `rowWrapper` to
 * make each row a router link.
 *
 * React keys each row by the event's `id`, so a re-passed or re-ordered event
 * list keeps the rendered rows per id. Solid's `For` keys by reference, so the
 * rows are keyed through stable per-id records: the record for an id is created
 * once and reused, while the row's content reads the CURRENT event for that id
 * reactively.
 *
 * @param props - Component props (see the timeline's props).
 * @returns The rendered timeline.
 */
export const ActivityTimeline: Component<ActivityTimelineProps> = (props) => {
  const cm = getClassMap()
  const toneOf = (event: TimelineEventData): TimelineKindTone =>
    props.toneByKind?.[event.kind] ?? props.defaultTone ?? FALLBACK_TONE

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
  const eventFor = (id: string): TimelineEventData =>
    props.events.find((event) => event.id === id) as TimelineEventData

  return (
    <div class={cm.cn(cm.card(), cm.sp('p', 6), props.className)}>
      {props.header}
      <div class={cm.cn(cm.stack(8), cm.position('relative'))}>
        {/*
          Connector rail. Color comes from the theme border token (cm.bgBorder,
          light/dark aware); the exact geometry (offsets + 1px width) has no
          ClassMap resolver, so it stays inline. Absolutely positioned, so it is
          out of the flex flow and never affects row spacing.
        */}
        <span
          aria-hidden="true"
          class={cm.cn(cm.bgBorder)}
          style={{
            position: 'absolute',
            left: '0.75rem',
            top: '0.5rem',
            bottom: '0.5rem',
            width: '1px',
          }}
        />
        <For each={keyedRows()}>
          {(row) => (
            <ActivityTimelineRow
              event={eventFor(row.id)}
              tone={toneOf(eventFor(row.id))}
              wrapper={
                props.rowWrapper
                  ? (children: JSX.Element) => props.rowWrapper!(eventFor(row.id), children)
                  : undefined
              }
            />
          )}
        </For>
      </div>
      {props.footer}
    </div>
  )
}
