/**
 * Types of `@molecule/app-hero-metric-card-angular` — the Angular counterpart
 * of `@molecule/app-hero-metric-card-react`, with the same prop names and
 * values.
 *
 * @module
 */

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
 * Semantic accent names for the hero card's top-edge accent bar.
 *
 * Each name resolves at render time to a real ClassMap `ColorVariant` (and
 * therefore a real, theme-aware color token). Note the two the theme has no
 * matching token for: `'danger'` → `error` and `'neutral'` → `secondary`.
 */
export type HeroMetricSemanticAccent =
  'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

/**
 * Optional accent color for the hero card's top edge.
 *
 * A semantic name ({@link HeroMetricSemanticAccent}) is resolved through
 * `cm.progressColor()` to a real, theme-aware ClassMap color token, so the
 * accent bar is visibly colored in both light and dark themes. An arbitrary
 * CSS color string is also accepted and applied inline (a one-off accent
 * color — the documented ClassMap exception).
 */
export type HeroMetricAccent = HeroMetricSemanticAccent | (string & { __raw?: never })

/**
 * Props accepted by `HeroMetricCard` — the same props
 * `@molecule/app-hero-metric-card-react` accepts. Node props (`title`,
 * `value`, `unit`, `subtitle`, `progressRing`, `icon`) are typed `unknown`:
 * pass a plain string as the input, or project content as `[slot=<name>]`
 * children of the host element.
 */
export interface HeroMetricCardProps {
  /** Title / label for the metric — a string input, or `[slot=title]` projected content. */
  title?: unknown
  /** The large primary value — a string input, or `[slot=value]` projected content. */
  value?: unknown
  /** Optional unit shown next to the value — a string input, or `[slot=unit]` content. */
  unit?: unknown
  /** Optional trend chip rendered below the value. */
  trend?: HeroMetricTrend
  /** Optional supporting text below the trend / value — a string input, or `[slot=subtitle]` content. */
  subtitle?: unknown
  /** Optional progress ring or sparkline node shown to the right — `[slot=progressRing]` content. */
  progressRing?: unknown
  /** Optional leading icon (used when no `progressRing` is provided) — `[slot=icon]` content. */
  icon?: unknown
  /** Optional accent border color (top edge). */
  accent?: HeroMetricAccent
  /** Optional click handler — turns the card into a button-role interactive. */
  onClick?: (event?: MouseEvent) => void
  /**
   * When `true`, swaps the value for a localized loading line and
   * announces a loading state to assistive tech.
   */
  loading?: boolean
  /** Extra classes on the outer Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/** Props accepted by `HeroMetricTrendChip`. */
export interface HeroMetricTrendChipProps {
  /** Direction + pre-formatted delta string. */
  trend: HeroMetricTrend
  /** Extra classes. */
  className?: string
}
