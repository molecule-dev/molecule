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
  dotClass: 'bg-primary',
  iconClass: 'text-on-primary',
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
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-3xl shadow-sm',
        className,
      )}
    >
      {header ?? null}
      <div
        className={cm.cn(
          cm.stack(8),
          'relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-surface-container-high',
        )}
      >
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
