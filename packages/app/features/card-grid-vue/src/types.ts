/**
 * Types for the Vue card-grid and bento-grid layouts.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Data descriptor for a single cell in a BentoGrid layout. */
export interface BentoItem {
  /** Unique item identifier (Vue key). */
  id: string
  /** Card content (React's `ReactNode`: a VNode or text). */
  content: VNodeChild
  /** CSS grid-column-span (1-12). Defaults to 4. */
  colSpan?: number
  /** CSS grid-row-span (1-6). Defaults to 1. */
  rowSpan?: number
  /** Named grid-area when using `areas` layout. */
  area?: string
}

/** Props for {@link BentoGrid}. */
export interface BentoGridProps {
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

/** Props for {@link CardGrid}. */
export interface CardGridProps {
  /** Cards — the default slot (also accepted as a `children` prop). */
  children?: VNodeChild
  /** Column count at the md+ breakpoint. 1–6. Defaults to 3. */
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  /** Gap between cards. */
  gap?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes. */
  className?: string
}
