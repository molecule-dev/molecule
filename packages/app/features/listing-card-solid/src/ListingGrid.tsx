import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { ListingGridProps } from './types.js'

/**
 * Grid for `<ListingCard>`s — a fixed `columns`-column grid at every viewport
 * width.
 *
 * This is the Solid counterpart of `@molecule/app-listing-card-react`'s
 * `ListingGrid`: the same props (React names), the same ClassMap tokens and
 * the same DOM for the same input.
 *
 * @param props - Component props (see {@link ListingGridProps}).
 * @returns The rendered grid.
 */
export const ListingGrid: Component<ListingGridProps> = (props) => {
  const cm = getClassMap()
  const columns = (): number => props.columns ?? 3
  const gap = (): 'xs' | 'sm' | 'md' | 'lg' => props.gap ?? 'md'
  return (
    <div class={cm.cn(cm.grid({ cols: columns(), gap: gap() }), props.className)}>
      {props.children}
    </div>
  )
}
