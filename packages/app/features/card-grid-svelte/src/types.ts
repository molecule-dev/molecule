/**
 * Types for the Svelte card-grid and bento-grid layouts.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Data descriptor for a single cell in a BentoGrid layout. */
export interface BentoItem {
  /** Unique item identifier (Svelte's keyed `{#each}` identity). */
  id: string
  /** Card content (React's `ReactNode`: text, or a snippet rendering a node). */
  content: Snippet | string | number
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
  /** Cards — the default content. */
  children?: Snippet
  /** Column count at the md+ breakpoint. 1–6. Defaults to 3. */
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  /** Gap between cards. */
  gap?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes. */
  className?: string
}
