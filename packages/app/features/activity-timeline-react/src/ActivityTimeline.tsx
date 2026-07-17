/**
 * Vertical activity timeline with connector line and dot markers.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { ActivityTimelineRow } from './ActivityTimelineRow.js'
import type { TimelineEventData, TimelineKindTone } from './types.js'

interface ActivityTimelineProps {
  events: TimelineEventData[]
  /** Visual treatment per event kind. Falls back to a generic dot for unknown kinds. */
  toneByKind?: Record<string, TimelineKindTone>
  /** Default tone applied when `toneByKind` doesn't list the event's kind. */
  defaultTone?: TimelineKindTone
  /** Wrap each row (e.g. with a <Link>). Receives the per-event data. */
  rowWrapper?: (event: TimelineEventData, children: ReactNode) => ReactNode
  /** Slot rendered above the timeline (heading, filters, etc.). */
  header?: ReactNode
  /** Slot rendered below the timeline (load-more link, footer chips, etc.). */
  footer?: ReactNode
  className?: string
}

const FALLBACK_TONE: TimelineKindTone = {
  icon: 'event',
}

/**
 * Stack events vertically with a connector line and per-kind dot
 * markers. Compose with `header`/`footer` slots or pass `rowWrapper` to
 * make each row a router `<Link>`.
 */
export function ActivityTimeline({
  events,
  toneByKind,
  defaultTone,
  rowWrapper,
  header,
  footer,
  className,
}: ActivityTimelineProps): JSX.Element {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.card(), cm.sp('p', 6), className)}>
      {header ?? null}
      <div className={cm.cn(cm.stack(8), cm.position('relative'))}>
        {/*
          Connector rail. Color comes from the theme border token (cm.bgBorder,
          light/dark aware); the exact geometry (offsets + 1px width) has no
          ClassMap resolver, so it stays inline. Absolutely positioned, so it is
          out of the flex flow and never affects row spacing.
        */}
        <span
          aria-hidden
          className={cm.cn(cm.bgBorder)}
          style={{
            position: 'absolute',
            left: '0.75rem',
            top: '0.5rem',
            bottom: '0.5rem',
            width: 1,
          }}
        />
        {events.map((event) => {
          const tone = toneByKind?.[event.kind] ?? defaultTone ?? FALLBACK_TONE
          return (
            <ActivityTimelineRow
              key={event.id}
              event={event}
              tone={tone}
              wrapper={rowWrapper ? (children) => rowWrapper(event, children) : undefined}
            />
          )
        })}
      </div>
      {footer ?? null}
    </div>
  )
}

export default ActivityTimeline
