/**
 * ListingGrid component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { ListingGridProps } from './types.js'

/**
 * ListingGrid component.
 *
 * Grid for listing cards — a fixed `columns`-column grid at every viewport
 * width. The host IS the root `div` (`div[mol-listing-grid]`), matching React's
 * root exactly; the cards are the element's default projected content.
 */
@Component({
  selector: 'div[mol-listing-grid]',
  standalone: true,
  inputs: ['columns', 'gap', 'className'],
  host: {
    '[class]': 'classes()',
  },
  template: '<ng-content></ng-content>',
})
export class ListingGrid {
  /** Column count, fixed at every viewport width (defaults to `3` at read time). */
  columns?: ListingGridProps['columns']
  /** Gap between cards (defaults to `'md'` at read time). */
  gap?: ListingGridProps['gap']
  /** Extra classes. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the grid class list (React's `cm.grid({ cols, gap })` plus the
   * extra `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().grid({ cols: this.columns ?? 3, gap: this.gap ?? 'md' }),
      this.className,
    )
  }
}
