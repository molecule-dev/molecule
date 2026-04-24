import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { TimelineEvent } from './TimelineEvent.js'
import type { TimelineEventData } from './types.js'

interface TimelineProps {
  events: TimelineEventData[]
  /** Optional renderer for date separators between consecutive events. */
  renderDateSeparator?: (event: TimelineEventData, prev?: TimelineEventData) => ReactNode
  /** Rendered when there are no events. */
  emptyState?: ReactNode
  /** Extra classes on the outer wrapper. */
  className?: string
}

/**
 * Vertical chronological list of events. Each event renders with a
 * marker + connector on the left (`<TimelineEvent>`). Optional date
 * separators can be inserted by returning a node from `renderDateSeparator`.
 * @param root0
 * @param root0.events
 * @param root0.renderDateSeparator
 * @param root0.emptyState
 * @param root0.className
 */
export function Timeline({ events, renderDateSeparator, emptyState, className }: TimelineProps) {
  const cm = getClassMap()
  if (events.length === 0 && emptyState) return <>{emptyState}</>
  return (
    <div className={cm.cn(cm.stack(0 as const), className)}>
      {events.map((event, i) => {
        const prev = i > 0 ? events[i - 1] : undefined
        const separator = renderDateSeparator?.(event, prev)
        return (
          <div key={event.id}>
            {separator}
            <TimelineEvent event={event} isLast={i === events.length - 1} />
          </div>
        )
      })}
    </div>
  )
}
