import type { ReactNode } from 'react'

/**
 * Direction of a hero-metric trend chip.
 *
 * - `'up'` — value rose since the prior period.
 * - `'down'` — value fell since the prior period.
 */
export type HeroMetricTrendDirection = 'up' | 'down'

/**
 * Trend chip rendered below the hero value.
 *
 * `delta` is rendered verbatim — the caller is responsible for sign,
 * units, and locale formatting.
 */
export interface HeroMetricTrend {
  /** Direction arrow / color. */
  direction: HeroMetricTrendDirection
  /** Pre-formatted delta string, e.g. `'+2.4%'` or `'-12 bpm'`. */
  delta: string
}

/**
 * Optional accent border color for the hero card.
 *
 * Maps to a semantic ClassMap border-color token. Use `'primary'` /
 * `'success'` / `'warning'` / `'danger'` / `'info'` / `'neutral'` to
 * align with the ClassMap palette; an arbitrary CSS color string is also
 * accepted (rendered as an inline `borderTopColor` per molecule design
 * rules — colored accent bars are the documented exception).
 */
export type HeroMetricAccent =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | (string & { __raw?: never })

/**
 * Props for `<HeroMetricCard>`.
 */
export interface HeroMetricCardProps {
  /** Title / label for the metric (usually `t('...')`). */
  title: ReactNode
  /** The large primary value (string or formatted number). */
  value: ReactNode
  /** Optional unit shown next to the value (e.g. `'kcal'`, `'bpm'`). */
  unit?: ReactNode
  /** Optional trend chip rendered below the value. */
  trend?: HeroMetricTrend
  /** Optional supporting text below the trend / value. */
  subtitle?: ReactNode
  /** Optional progress ring or sparkline ReactNode shown to the right. */
  progressRing?: ReactNode
  /** Optional leading icon (used when no `progressRing` is provided). */
  icon?: ReactNode
  /** Optional accent border color (top edge). */
  accent?: HeroMetricAccent
  /** Optional click handler — turns the card into a button-role interactive. */
  onClick?: () => void
  /**
   * When `true`, swaps the value/title for a skeleton placeholder and
   * announces a loading state to assistive tech.
   */
  loading?: boolean
  /** Extra classes on the outer Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
