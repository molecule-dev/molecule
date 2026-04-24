import type { CSSProperties, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/**
 *
 */
export interface BentoItem {
  /** Unique item identifier (React key). */
  id: string
  /** Card content. */
  content: ReactNode
  /** CSS grid-column-span (1-12). Defaults to 4. */
  colSpan?: number
  /** CSS grid-row-span (1-6). Defaults to 1. */
  rowSpan?: number
  /** Named grid-area when using `areas` layout. */
  area?: string
}

interface BentoGridProps {
  /** Items to render. */
  items: BentoItem[]
  /**
   * Optional `grid-template-areas` string (e.g. `'a a b' 'c d d'`). When
   * provided, each `BentoItem.area` must match a token in the template.
   */
  areas?: string
  /** Default column count when `areas` is absent. Defaults to 12. */
  columns?: number
  /** Gap between items. */
  gap?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes. */
  className?: string
}

/**
 * Bento-style grid — items span multiple cells for a magazine / dashboard
 * layout. Works in two modes: (a) col/row-span driven, (b) named-areas
 * driven via the `areas` prop.
 * @param root0
 * @param root0.items
 * @param root0.areas
 * @param root0.columns
 * @param root0.gap
 * @param root0.className
 */
export function BentoGrid({ items, areas, columns = 12, gap = 'md', className }: BentoGridProps) {
  const cm = getClassMap()
  const gridStyle: CSSProperties = areas
    ? { display: 'grid', gridTemplateAreas: areas }
    : { display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
  return (
    <div className={cm.cn(cm.grid({ gap }), className)} style={gridStyle}>
      {items.map((it) => (
        <div
          key={it.id}
          style={
            areas
              ? { gridArea: it.area }
              : { gridColumn: `span ${it.colSpan ?? 4}`, gridRow: `span ${it.rowSpan ?? 1}` }
          }
        >
          {it.content}
        </div>
      ))}
    </div>
  )
}
