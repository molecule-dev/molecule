import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface KpiCardGridProps {
  /** KPI cards. */
  children: ReactNode
  /** Column count at the md+ breakpoint. 2–6. Defaults to 4. */
  columns?: 2 | 3 | 4 | 5 | 6
  /** Gap between cards. */
  gap?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes. */
  className?: string
}

/**
 * Responsive grid for KPI cards. Collapses to a single column on narrow
 * viewports and grows to `columns` on md+. Gap and column count are tokens
 * resolved against the wired ClassMap.
 * @param root0
 * @param root0.children
 * @param root0.columns
 * @param root0.gap
 * @param root0.className
 */
export function KpiCardGrid({ children, columns = 4, gap = 'md', className }: KpiCardGridProps) {
  const cm = getClassMap()
  return <div className={cm.cn(cm.grid({ cols: columns, gap }), className)}>{children}</div>
}
