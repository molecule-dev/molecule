import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { TimelineDateProps } from './types.js'

/**
 * Date separator rendered between timeline groups.
 *
 * This is the Solid counterpart of `@molecule/app-timeline-react`'s
 * `TimelineDate`: the same props (React names), the same ClassMap tokens, and
 * the same DOM for the same input.
 *
 * @param props - Component props (see {@link TimelineDateProps}).
 * @returns The rendered date separator.
 */
export const TimelineDate: Component<TimelineDateProps> = (props) => {
  const cm = getClassMap()
  return (
    <div
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('py', 2),
        cm.textSize('xs'),
        cm.fontWeight('semibold'),
        props.className,
      )}
    >
      <span class={cm.flex1}>{props.children}</span>
    </div>
  )
}
