/**
 * Public types for the reputation-badge-vue feature.
 *
 * @module
 */

/**
 * Reputation level identifiers — used to pick a tier color/label.
 *
 * Apps that need finer granularity can pass a `level` string of any value;
 * unknown values fall back to `'newcomer'` styling.
 */
export type ReputationLevel = 'newcomer' | 'contributor' | 'trusted' | 'veteran' | 'legend'

/**
 * Optional thresholds for deriving a `ReputationLevel` from a numeric score.
 *
 * If a `level` prop isn't passed to `<ReputationBadge>`, the component will
 * pick the highest level whose threshold the `score` meets or exceeds.
 *
 * Default thresholds:
 * - `contributor` >= 100
 * - `trusted` >= 500
 * - `veteran` >= 2000
 * - `legend` >= 10000
 * - below 100 → `newcomer`
 */
export interface ReputationThresholds {
  /** Score >= contributor threshold ⇒ `'contributor'`. */
  contributor: number
  /** Score >= trusted threshold ⇒ `'trusted'`. */
  trusted: number
  /** Score >= veteran threshold ⇒ `'veteran'`. */
  veteran: number
  /** Score >= legend threshold ⇒ `'legend'`. */
  legend: number
}

/**
 * A single earned badge — one icon on the `<BadgeShelf>` row.
 */
export interface Badge {
  /** Stable identifier (used as the row key + click payload). */
  id: string
  /** Display name (translated upstream — passed verbatim). */
  name: string
  /** Optional longer description, shown in the native tooltip. */
  description?: string
  /** Icon glyph or short emoji (rendered inline). Mutually exclusive with `iconSrc`. */
  icon?: string
  /** Image URL for the badge icon. */
  iconSrc?: string
  /** ISO date string the badge was earned (passed back via `onClick`). */
  earnedAt?: string
}

/**
 * Props accepted by the `ReputationBadge` component — the same props
 * React's `@molecule/app-reputation-badge-react` accepts.
 */
export interface ReputationBadgeProps {
  /** Numeric reputation / karma score. */
  score: number
  /**
   * Explicit reputation level. If omitted, derived from `score` via
   * `levelForScore` using `thresholds` (or `DEFAULT_THRESHOLDS`).
   */
  level?: ReputationLevel
  /** Override the default score → level thresholds. */
  thresholds?: ReputationThresholds
  /**
   * Layout variant.
   * - `'compact'` (default) — score number inline with a small level chip.
   * - `'full'` — stacked layout with a "Reputation" caption above the row.
   */
  variant?: 'compact' | 'full'
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}

/**
 * Props accepted by the `BadgeShelf` component — the same props React's
 * `@molecule/app-reputation-badge-react` accepts.
 */
export interface BadgeShelfProps {
  /** Earned badges to display, ordered most-prominent-first. */
  badges: Badge[]
  /**
   * Maximum number of badge icons rendered inline. Any remaining are
   * summarised in a trailing `+N` overflow chip.
   *
   * @default 5
   */
  limit?: number
  /**
   * Click handler — invoked with the clicked badge (or `null` when the
   * trailing overflow chip is clicked, signalling "expand all").
   */
  onClick?: (badge: Badge | null) => void
  /** Extra classes merged onto the outer row. */
  className?: string
}
