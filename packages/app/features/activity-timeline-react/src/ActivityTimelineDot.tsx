import type { JSX } from 'react'

/**
 * Single dot + icon marker used by `<ActivityTimeline>`. Exposed so
 * consumers can compose their own timeline layouts when the default
 * stacking shape doesn't fit.
 *
 * @module
 */
import { getClassMap } from '@molecule/app-ui'

import type { TimelineKindTone } from './types.js'

interface ActivityTimelineDotProps {
  tone: TimelineKindTone
  className?: string
}

/** Dot + icon marker. */
export function ActivityTimelineDot({ tone, className }: ActivityTimelineDotProps): JSX.Element {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.w(6),
        cm.h(6),
        tone.dotClass ?? 'bg-primary',
        'absolute left-0 top-0 rounded',
        tone.iconClass ?? 'text-on-primary',
        className,
      )}
    >
      <span className={cm.cn(cm.textSize('xs'), 'material-symbols-outlined')}>{tone.icon}</span>
    </div>
  )
}

export default ActivityTimelineDot
