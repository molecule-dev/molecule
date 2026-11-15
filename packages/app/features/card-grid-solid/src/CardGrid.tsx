import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { CardGridProps } from './types.js'

/**
 * Generic responsive card grid. Collapses to one column on narrow viewports
 * and grows to `columns` on md+. Typical uses: product grids, post grids,
 * dashboard widget rows.
 *
 * This is the Solid counterpart of `@molecule/app-card-grid-react`'s
 * `CardGrid`: the same props (React names), the same ClassMap tokens, and the
 * same DOM for the same input.
 *
 * @param props - Component props (see {@link CardGridProps}).
 * @returns The rendered card grid.
 */
export const CardGrid: Component<CardGridProps> = (props) => {
  const cm = getClassMap()
  const columns = (): number => props.columns ?? 3
  const gap = (): 'xs' | 'sm' | 'md' | 'lg' => props.gap ?? 'md'
  return (
    <div class={cm.cn(cm.grid({ cols: columns(), gap: gap() }), props.className)}>
      {props.children}
    </div>
  )
}
