/**
 * Sticky horizontal-scrolling container for a row of faceted-search
 * primitives (segmented control, filter pills, more-filters drawer).
 * Children compose freely.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface FacetedSearchBarProps {
  children: ReactNode
  /** Sticky top offset (px). Defaults to 64 (i.e. below a 16-unit top nav). */
  topOffsetPx?: number
  className?: string
}

/** Sticky filter-bar container. */
export function FacetedSearchBar({
  children,
  topOffsetPx = 64,
  className,
}: FacetedSearchBarProps): JSX.Element {
  const cm = getClassMap()
  return (
    <div
      data-mol-id="filter-bar"
      style={{ top: `${topOffsetPx}px` }}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('px', 6),
        cm.sp('py', 3),
        cm.surface,
        cm.w('full'),
        'fixed z-40 border-b border-outline-variant/20 overflow-x-auto hide-scrollbar',
        className,
      )}
    >
      {children}
    </div>
  )
}

export default FacetedSearchBar
