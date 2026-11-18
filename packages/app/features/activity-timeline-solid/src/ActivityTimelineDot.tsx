/**
 * Solid single dot + icon marker used by `<ActivityTimeline>`. Exposed so
 * consumers can compose their own timeline layouts when the default
 * stacking shape doesn't fit.
 *
 * Solid counterpart of `@molecule/app-activity-timeline-react`'s
 * `ActivityTimelineDot` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { TimelineKindTone } from './types.js'

/** Props accepted by the {@link ActivityTimelineDot} component. */
interface ActivityTimelineDotProps {
  /** Visual treatment for the event's kind. */
  tone: TimelineKindTone
  /** Extra classes on the dot. */
  className?: string
}

/**
 * Dot + icon marker.
 *
 * @param props - Component props (see the dot's props).
 * @returns The rendered dot.
 */
export const ActivityTimelineDot: Component<ActivityTimelineDotProps> = (props) => {
  const cm = getClassMap()
  return (
    <div
      class={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.w(6),
        cm.h(6),
        cm.position('absolute'),
        cm.roundedFull,
        // Consumer-supplied `dotClass`/`iconClass` win; the package defaults use
        // theme tokens (subtle primary fill + primary icon) that read correctly
        // in both light and dark — never a light-only literal.
        props.tone.dotClass ?? cm.bgPrimarySubtle,
        props.tone.iconClass ?? cm.textPrimary,
        props.className,
      )}
      style={{ left: '0px', top: '0px' }}
    >
      <span class={cm.cn(cm.textSize('xs'), cm.iconGlyphFont)}>{props.tone.icon}</span>
    </div>
  )
}
