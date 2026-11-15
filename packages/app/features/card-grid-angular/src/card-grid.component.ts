/**
 * CardGrid component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * CardGrid component.
 *
 * The generic responsive card grid. The host IS the root `<div>`
 * (`div[mol-card-grid]`), matching React's root exactly; the cards are the
 * element's default projected content, so they land inside that div just as
 * React's `children` do. Collapses to one column on narrow viewports and grows
 * to `columns` on md+ via the ClassMap grid.
 */
@Component({
  selector: 'div[mol-card-grid]',
  standalone: true,
  inputs: ['columns', 'gap', 'className'],
  host: {
    '[class]': 'classes()',
  },
  template: '<ng-content></ng-content>',
})
export class CardGrid {
  /** Column count at the md+ breakpoint (defaults to `3` at read time). */
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  /** Gap between cards (defaults to `'md'` at read time). */
  gap?: 'xs' | 'sm' | 'md' | 'lg'
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
