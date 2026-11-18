/**
 * KpiCardTrend component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { KpiTrendDirection } from './types.js'

/**
 * KpiCardTrend component.
 *
 * Tiny arrow + delta% for a {@link KpiCard}'s trend slot. The host IS the outer
 * `<span>` (`span[mol-kpi-card-trend]`), matching React's root exactly. The
 * `direction` only picks the arrow glyph — no color is applied; pass a semantic
 * text color via `className` for red/green deltas.
 */
@Component({
  selector: 'span[mol-kpi-card-trend]',
  standalone: true,
  inputs: ['delta', 'direction', 'suffix', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<span aria-hidden="true">{{ arrow() }}</span><span>{{ amount() }}</span>`,
})
export class KpiCardTrend {
  /** Numeric delta to display (sign drives direction when `direction` is omitted). */
  delta = 0
  /** Explicit direction override. */
  direction?: KpiTrendDirection
  /** Suffix appended to the delta (defaults to `'%'` at read time). */
  suffix?: string
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
   * The effective direction (React's explicit override, else the delta's sign).
   * @returns The trend direction.
   */
  directionValue(): KpiTrendDirection {
    return this.direction ?? (this.delta > 0 ? 'up' : this.delta < 0 ? 'down' : 'flat')
  }

  /**
   * The arrow glyph for the direction.
   * @returns The arrow character.
   */
  arrow(): string {
    const direction = this.directionValue()
    return direction === 'up' ? '▲' : direction === 'down' ? '▼' : '–'
  }

  /**
   * The absolute delta and its suffix (React's `suffix = '%'` default).
   * @returns The rendered amount.
   */
  amount(): string {
    return `${Math.abs(this.delta)}${this.suffix ?? '%'}`
  }

  /**
   * The host's class list (`cm.flex` + `cm.textSize('sm')` + semibold + `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'xs' }),
      this.cm().textSize('sm'),
      this.cm().fontWeight('semibold'),
      this.className,
    )
  }
}
