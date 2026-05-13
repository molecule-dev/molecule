/**
 * Single row in `<ActivityTimeline>`. Header / description / meta /
 * footer + a dot on the left, with the connector line drawn by the
 * parent container.
 *
 * @module
 */

import { getClassMap } from '@molecule/app-ui'
import type { ReactNode } from 'react'

import { ActivityTimelineDot } from './ActivityTimelineDot.js'
import type { TimelineEventData, TimelineKindTone } from './types.js'

interface ActivityTimelineRowProps {
  event: TimelineEventData
  tone: TimelineKindTone
  /** Render the row inside a custom wrapper (e.g. <Link> for routing). */
  wrapper?: (children: ReactNode) => ReactNode
}

const DEFAULT_TONE: TimelineKindTone = { icon: 'event' }

/** A single timeline row. */
export function ActivityTimelineRow({ event, tone, wrapper }: ActivityTimelineRowProps) {
  const cm = getClassMap()
  const inner = (
    <>
      <ActivityTimelineDot tone={tone ?? DEFAULT_TONE} />
      <div>
        <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 1))}>
          <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
            {event.title}
          </h3>
          {event.meta ? (
            <span
              className={cm.cn(
                cm.fontWeight('medium'),
                'text-[10px] text-on-surface/50 uppercase whitespace-nowrap',
              )}
            >
              {event.meta}
            </span>
          ) : null}
        </div>
        {event.description ? (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{event.description}</p>
        ) : null}
        {event.footer ?? null}
      </div>
    </>
  )

  const baseClass = cm.cn(cm.sp('pl', 10), 'relative')
  if (wrapper) return <div className={baseClass}>{wrapper(inner)}</div>
  return <div className={baseClass}>{inner}</div>
}

export default ActivityTimelineRow
