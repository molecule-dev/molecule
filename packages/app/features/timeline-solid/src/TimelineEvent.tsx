import { type Component, Show } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import { TimelineRail } from './TimelineRail.jsx'
import type { TimelineEventProps } from './types.js'

/**
 * One row of a `<Timeline>`: [rail (marker + connector)] [timestamp / title /
 * body].
 *
 * This is the Solid counterpart of `@molecule/app-timeline-react`'s
 * `TimelineEvent`: the same props (React names), the same ClassMap tokens, and
 * the same DOM for the same input.
 *
 * @param props - Component props (see {@link TimelineEventProps}).
 * @returns The rendered event row.
 */
export const TimelineEvent: Component<TimelineEventProps> = (props) => {
  const cm = getClassMap()
  return (
    <div class={cm.cn(cm.flex({ align: 'stretch', gap: 'sm' }), props.className)}>
      <TimelineRail marker={props.event.marker} connector={!props.isLast} />
      <div class={cm.cn(cm.flex1, cm.stack(1 as const), cm.sp('pb', 4))}>
        <div class={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))}>{props.event.timestamp}</div>
        <div class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{props.event.title}</div>
        <Show when={props.event.body}>
          <div class={cm.textSize('sm')}>{props.event.body}</div>
        </Show>
      </div>
    </div>
  )
}
