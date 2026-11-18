/**
 * Solid fixed filter-bar container.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { FacetedSearchBarProps } from './types.js'

/**
 * Fixed-position horizontal container for a row of faceted-search primitives
 * (segmented control, filter pills, more-filters drawer). Children compose
 * freely.
 *
 * Solid counterpart of `@molecule/app-faceted-search-react`'s
 * `FacetedSearchBar` — the same props (React names), the same ClassMap tokens
 * and the same DOM for the same input.
 *
 * @param props - Component props (see {@link FacetedSearchBarProps}).
 * @returns The rendered filter bar.
 */
export const FacetedSearchBar: Component<FacetedSearchBarProps> = (props) => {
  const cm = getClassMap()
  /** React's `topOffsetPx = 64` default parameter. */
  const topOffset = (): number => props.topOffsetPx ?? 64

  return (
    <div
      data-mol-id="filter-bar"
      style={{ top: `${topOffset()}px` }}
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('px', 6),
        cm.sp('py', 3),
        cm.surface,
        cm.w('full'),
        cm.facetedSearchBar,
        props.className,
      )}
    >
      {props.children}
    </div>
  )
}
