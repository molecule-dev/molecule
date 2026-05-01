/**
 * Vote tally + creation timestamp for an item being ranked.
 *
 * `ups` and `downs` are independent counts — Reddit-style. The `score`
 * (`ups - downs`) is computed by the algorithms that need it.
 */
export interface RankItem {
  /** Number of upvotes / positive signals. Must be ≥ 0. */
  ups: number
  /** Number of downvotes / negative signals. Must be ≥ 0. */
  downs: number
  /**
   * When the item was created. Accepts `Date`, ISO-8601 string, or epoch ms
   * — normalised internally.
   */
  createdAt: Date | string | number
}

/**
 * Common context for any ranking algorithm. `now` is injected so the
 * functions stay pure (no `Date.now()` reads inside).
 */
export interface RankContext {
  /** Reference "now" for time-decay calculations. */
  now: Date | string | number
  /**
   * Decay exponent for HN-style and recency algorithms. Higher = faster
   * decay. Default `1.8` (HN's classic value).
   */
  gravity?: number
}

/** Identifier for the supported ranking algorithms. */
export type RankAlgorithm =
  | 'hn'
  | 'reddit-hot'
  | 'reddit-best'
  | 'reddit-controversial'
  | 'recency'
  | 'score'
