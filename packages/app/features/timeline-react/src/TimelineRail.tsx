import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface TimelineRailProps {
  /** Marker for this row — typically a dot or icon. */
  marker?: ReactNode
  /** Whether to render the vertical connector below the marker. */
  connector?: boolean
  /** Extra classes on the outer wrapper. */
  className?: string
}

/**
 * Left-hand rail of a timeline row — renders the marker and an optional
 * vertical connector extending downward.
 * @param root0
 * @param root0.marker
 * @param root0.connector
 * @param root0.className
 */
export function TimelineRail({ marker, connector = true, className }: TimelineRailProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), cm.shrink0, className)}>
      <div>{marker ?? <span aria-hidden>•</span>}</div>
      {connector && (
        <div
          className={cm.cn(cm.w(0 as const), cm.h('full'))}
          style={{ borderLeft: '1px solid currentColor', opacity: 0.2, minHeight: 24 }}
        />
      )}
    </div>
  )
}
