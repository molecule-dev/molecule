/**
 * Sticky horizontal-scrolling container for a row of faceted-search
 * primitives (segmented control, filter pills, more-filters drawer).
 * Children compose freely.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Box } from '@molecule/app-ui-react/elements'

/** Props for {@link FacetedSearchBar}. */
export interface FacetedSearchBarProps {
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
    <Box
      as="div"
      data-mol-id="filter-bar"
      webStyle={{ top: `${topOffsetPx}px` }}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('px', 6),
        cm.sp('py', 3),
        cm.surface,
        cm.w('full'),
        cm.facetedSearchBar,
        className,
      )}
    >
      {children}
    </Box>
  )
}

export default FacetedSearchBar
