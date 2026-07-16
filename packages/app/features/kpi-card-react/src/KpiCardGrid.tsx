import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

export interface KpiCardGridProps {
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
 * Grid for KPI cards — a fixed `columns`-column grid at every viewport
 * width (it does not collapse on narrow viewports). Gap and column count
 * are tokens resolved against the wired ClassMap.
 * @param props - Component props (see {@link KpiCardGridProps}).
 */
export function KpiCardGrid({
  children,
  columns = 4,
  gap = 'md',
  className,
}: KpiCardGridProps): JSX.Element {
  const cm = getClassMap()
  return <div className={cm.cn(cm.grid({ cols: columns, gap }), className)}>{children}</div>
}
