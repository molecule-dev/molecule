/**
 * Solid single row in `<ActivityTimeline>`: header / description / meta /
 * footer + a dot on the left, with the connector line drawn by the parent
 * container.
 *
 * Solid counterpart of `@molecule/app-activity-timeline-react`'s
 * `ActivityTimelineRow` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import { ActivityTimelineDot } from './ActivityTimelineDot.jsx'
import type { TimelineEventData, TimelineKindTone } from './types.js'

/** The row's default tone when the caller passes none. */
const DEFAULT_TONE: TimelineKindTone = { icon: 'event' }

/** Props accepted by the {@link ActivityTimelineRow} component. */
interface ActivityTimelineRowProps {
  /** The event the row shows. */
  event: TimelineEventData
  /** Visual treatment for the event's kind. */
  tone: TimelineKindTone
  /** Render the row inside a custom wrapper (e.g. a router link). */
  wrapper?: (children: JSX.Element) => JSX.Element
}

/**
 * A single timeline row.
 *
 * @param props - Component props (see the row's props).
 * @returns The rendered row.
 */
export const ActivityTimelineRow: Component<ActivityTimelineRowProps> = (props) => {
  const cm = getClassMap()

  /** The row's own content: the dot column and the text block. */
  const inner = (): JSX.Element => (
    <>
      <ActivityTimelineDot tone={props.tone ?? DEFAULT_TONE} />
      <div>
        <div class={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 1))}>
          {/* Title inherits the theme foreground from the card surface — no explicit color. */}
          <h3 class={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>{props.event.title}</h3>
          {props.event.meta ? (
            <span
              class={cm.cn(cm.fontWeight('medium'), cm.textSize('xs'), cm.textMuted, cm.uppercase)}
              style={{ 'white-space': 'nowrap' }}
            >
              {props.event.meta}
            </span>
          ) : null}
        </div>
        {props.event.description ? (
          <p class={cm.cn(cm.textSize('xs'), cm.textMuted)}>{props.event.description}</p>
        ) : null}
        {props.event.footer ?? null}
      </div>
    </>
  )

  return (
    <div class={cm.cn(cm.sp('pl', 10), cm.position('relative'))}>
      {props.wrapper ? props.wrapper(inner()) : inner()}
    </div>
  )
}
