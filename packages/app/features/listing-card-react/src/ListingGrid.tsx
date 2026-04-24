import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface ListingGridProps {
  children: ReactNode
  /** Columns at md+. Defaults to 3. */
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  gap?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Responsive grid for `<ListingCard>`s. Alias for `CardGrid` tuned for
 * listing layouts — same shape, different semantic name so importers
 * can self-document.
 * @param root0
 * @param root0.children
 * @param root0.columns
 * @param root0.gap
 * @param root0.className
 */
export function ListingGrid({ children, columns = 3, gap = 'md', className }: ListingGridProps) {
  const cm = getClassMap()
  return <div className={cm.cn(cm.grid({ cols: columns, gap }), className)}>{children}</div>
}
