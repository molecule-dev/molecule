import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/** Props for the {@link TimelineDate} component. */
export interface TimelineDateProps {
  /** Date label ("Today", "Yesterday", "March 12, 2025"). */
  children: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Date separator rendered between timeline groups.
 * @param props - Component props (see {@link TimelineDateProps}).
 */
export function TimelineDate({ children, className }: TimelineDateProps): JSX.Element {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('py', 2),
        cm.textSize('xs'),
        cm.fontWeight('semibold'),
        className,
      )}
    >
      <span className={cm.flex1}>{children}</span>
    </div>
  )
}
