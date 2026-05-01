/**
 * NPS bucket tier — drives the bar color in the distribution chart.
 *
 * - `'detractor'` — score 0..detractorMax (inclusive, default 0..6).
 * - `'passive'` — score (detractorMax+1)..passiveMax (default 7..8).
 * - `'promoter'` — score (passiveMax+1)..10 (default 9..10).
 */
export type NpsTier = 'detractor' | 'passive' | 'promoter'

/**
 * Per-score row computed from the `scores` input.
 *
 * Used internally and re-exported so callers can render their own
 * legends / tooltips without re-deriving the bucket data.
 */
export interface NpsBucket {
  /** Survey score (0..10). */
  score: number
  /** Number of responses with this score. */
  count: number
  /** Tier the score belongs to (drives bar color). */
  tier: NpsTier
}

/**
 * Pure-data result returned by {@link computeNps}.
 *
 * - `score` — Net Promoter Score, range -100..100, rounded to nearest integer.
 *   Returns `0` when `total === 0` so consumers don't have to special-case
 *   empty datasets (callers can hide the score with `showScore={false}`).
 * - `total` — total response count.
 * - `detractors` / `passives` / `promoters` — per-tier response counts.
 * - `buckets` — per-score rows in display order (0 → 10).
 */
export interface NpsResult {
  score: number
  total: number
  detractors: number
  passives: number
  promoters: number
  buckets: NpsBucket[]
}

/**
 * Props for `<NpsDistribution>`.
 */
export interface NpsDistributionProps {
  /**
   * Raw 0..10 scores. Out-of-range or non-integer values are ignored.
   * The component does not mutate the array.
   */
  scores: number[]
  /**
   * Whether to render the computed NPS score line below the bars.
   * Defaults to `true`.
   */
  showScore?: boolean
  /**
   * Highest score still classified as a detractor. Defaults to `6`
   * (NPS standard: 0–6 detractors).
   */
  detractorMax?: number
  /**
   * Highest score still classified as a passive. Defaults to `8`
   * (NPS standard: 7–8 passives, 9–10 promoters).
   */
  passiveMax?: number
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
