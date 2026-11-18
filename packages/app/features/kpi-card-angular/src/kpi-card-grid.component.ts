/**
 * KpiCardGrid component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * KpiCardGrid component.
 *
 * The grid KPI cards sit in: a fixed `columns`-column grid at every viewport
 * width. The host IS the grid `<div>` (`div[mol-kpi-card-grid]`), matching
 * React's root exactly; the cards are projected content.
 */
@Component({
  selector: 'div[mol-kpi-card-grid]',
  standalone: true,
  inputs: ['columns', 'gap', 'className'],
  host: {
    '[class]': 'classes()',
  },
  template: '<ng-content></ng-content>',
})
export class KpiCardGrid {
  /** Column count (defaults to 4 at read time). */
  columns?: 2 | 3 | 4 | 5 | 6
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
   * The effective column count (React's `columns = 4` default).
   * @returns The column count.
   */
  columnsValue(): 2 | 3 | 4 | 5 | 6 {
    return this.columns ?? 4
  }

  /**
   * The effective gap (React's `gap = 'md'` default).
   * @returns The gap token.
   */
  gapValue(): 'xs' | 'sm' | 'md' | 'lg' {
    return this.gap ?? 'md'
  }

  /**
   * The host's class list (`cm.grid` plus `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().grid({ cols: this.columnsValue(), gap: this.gapValue() }),
      this.className,
    )
  }
}
