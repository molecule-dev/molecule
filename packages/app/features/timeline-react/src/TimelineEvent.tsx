import type { JSX } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { TimelineRail } from './TimelineRail.js'
import type { TimelineEventData } from './types.js'

/** Props for the {@link TimelineEvent} component. */
export interface TimelineEventProps {
  event: TimelineEventData
  /** Whether this is the last event in the list (suppresses the connector). */
  isLast?: boolean
  /** Extra classes. */
  className?: string
}

/**
 * One row of a `<Timeline>`: [rail (marker + connector)] [timestamp / title / body].
 * @param props - Component props (see {@link TimelineEventProps}).
 */
export function TimelineEvent({ event, isLast, className }: TimelineEventProps): JSX.Element {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'stretch', gap: 'sm' }), className)}>
      <TimelineRail marker={event.marker} connector={!isLast} />
      <div className={cm.cn(cm.flex1, cm.stack(1 as const), cm.sp('pb', 4))}>
        <div className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))}>{event.timestamp}</div>
        <div className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{event.title}</div>
        {event.body && <div className={cm.textSize('sm')}>{event.body}</div>}
      </div>
    </div>
  )
}
