import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

export interface CardGridProps {
  /** Cards. */
  children: ReactNode
  /** Column count at the md+ breakpoint. 1–6. Defaults to 3. */
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  /** Gap between cards. */
  gap?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes. */
  className?: string
}

/**
 * Generic responsive card grid. Collapses to one column on narrow viewports
 * and grows to `columns` on md+. Typical uses: product grids, post grids,
 * dashboard widget rows.
 * @param props - Component props (see {@link CardGridProps}).
 */
export function CardGrid({
  children,
  columns = 3,
  gap = 'md',
  className,
}: CardGridProps): JSX.Element {
  const cm = getClassMap()
  return <div className={cm.cn(cm.grid({ cols: columns, gap }), className)}>{children}</div>
}
