import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

export interface ListingGridProps {
  children: ReactNode
  /** Column count, fixed at every viewport width. Defaults to 3. */
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  gap?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Grid for `<ListingCard>`s — a fixed `columns`-column grid at every
 * viewport width. Alias for `CardGrid` tuned for listing layouts — same
 * shape, different semantic name so importers can self-document.
 * @param props - Component props (see {@link ListingGridProps}).
 */
export function ListingGrid({
  children,
  columns = 3,
  gap = 'md',
  className,
}: ListingGridProps): JSX.Element {
  const cm = getClassMap()
  return <div className={cm.cn(cm.grid({ cols: columns, gap }), className)}>{children}</div>
}
