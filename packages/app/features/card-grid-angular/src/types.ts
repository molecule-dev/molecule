/**
 * Types of `@molecule/app-card-grid-angular` — the Angular counterpart of
 * `@molecule/app-card-grid-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * A node-valued item content (React's `ReactNode`): in Angular it is text (a
 * string or number) or an `ng-template` reference rendered through
 * `NgTemplateOutlet` where the node would render. Not exported — React has no
 * matching public type, and the export surface must stay identical.
 */
type BentoItemContent = TemplateRef<unknown> | string | number

/** Data descriptor for a single cell in a BentoGrid layout. */
export interface BentoItem {
  /** Unique item identifier (the `@for` track key). */
  id: string
  /** Card content (a node template or text). */
  content: BentoItemContent
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

/**
 * Props for {@link CardGrid}. The cards are projected content in Angular (an
 * input cannot carry a node), so `children` is typed `unknown`: pass it in the
 * host template, not as a value.
 */
export interface CardGridProps {
  /** Cards, projected as the element's default content. */
  children?: unknown
  /** Column count at the md+ breakpoint. 1–6. Defaults to 3. */
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  /** Gap between cards. */
  gap?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes. */
  className?: string
}
