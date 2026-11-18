/**
 * HeroMetricTrendChip component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { HeroMetricTrend } from './types.js'

/**
 * HeroMetricTrendChip component.
 *
 * Compact trend indicator rendered below the hero value: a directional arrow
 * (▲ / ▼) followed by the caller-provided delta. The host IS the outer `<span>`
 * (`span[mol-hero-metric-trend-chip]`), matching React's root exactly. The
 * arrow's `aria-label` is localized through `useTranslation()`, so it follows a
 * locale switch.
 */
@Component({
  selector: 'span[mol-hero-metric-trend-chip]',
  standalone: true,
  inputs: ['trend', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<span [attr.aria-label]="label()" role="img">{{ arrow() }}</span><span>{{ trend.delta }}</span>`,
})
export class HeroMetricTrendChip {
  /** Direction + pre-formatted delta string. */
  trend!: HeroMetricTrend
  /** Extra classes. */
  className?: string

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The arrow glyph for the direction.
   * @returns The arrow character.
   */
  arrow(): string {
    return this.trend.direction === 'up' ? '▲' : '▼'
  }

  /**
   * The localized arrow label ("Trending up" / "Trending down").
   * @returns The aria label.
   */
  label(): string {
    return this.trend.direction === 'up'
      ? this.i18n.t('hero-metric-card.trend.up', {}, { defaultValue: 'Trending up' })
      : this.i18n.t('hero-metric-card.trend.down', {}, { defaultValue: 'Trending down' })
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
