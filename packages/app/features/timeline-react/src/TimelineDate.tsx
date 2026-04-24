import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface TimelineDateProps {
  /** Date label ("Today", "Yesterday", "March 12, 2025"). */
  children: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Date separator rendered between timeline groups.
 * @param root0
 * @param root0.children
 * @param root0.className
 */
export function TimelineDate({ children, className }: TimelineDateProps) {
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
