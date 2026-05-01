/**
 * Leaderboard engine type definitions.
 *
 * Generic ranked-aggregate over `(user_id, metric, time_window)`. Apps
 * can use named built-in windows (`daily`, `weekly`, `monthly`,
 * `all-time`) or arbitrary custom `[start, end)` windows. `scopeKey`
 * isolates separate boards within the same metric (e.g. per-classroom,
 * per-cohort, per-friend-group).
 *
 * @module
 */

/**
 * A single entry in a computed leaderboard.
 *
 * `rank` is 1-based and uses **competition ranking** (a.k.a. "1224"):
 * tied entries share the same rank, and the next distinct score skips
 * by the number of ties (1, 2, 2, 4 — no rank `3`).
 */
export interface LeaderboardEntry {
  /** The user identifier this entry represents. */
  user_id: string
  /**
   * 1-based competition rank. Tied entries share the same `rank`; the
   * next distinct score skips ahead by the number of preceding ties.
   */
  rank: number
  /** Aggregated score for the entry within the requested window. */
  score: number
  /** `true` when at least one other entry in the result shares this rank. */
  tied?: boolean
}

/**
 * Named time windows supported out of the box.
 *
 * `daily`, `weekly`, `monthly` are computed against the **calendar
 * boundaries in UTC** of the reference instant (defaulting to "now").
 * `all-time` aggregates every recorded event regardless of timestamp.
 */
export type NamedWindow = 'daily' | 'weekly' | 'monthly' | 'all-time'

/**
 * A custom half-open `[start, end)` window expressed as `Date`s.
 */
export interface CustomWindow {
  /** Inclusive lower bound. */
  start: Date
  /** Exclusive upper bound. */
  end: Date
}

/**
 * The full set of supported window descriptors.
 */
export type LeaderboardWindow = NamedWindow | CustomWindow

/**
 * Tie-break strategy for entries with equal aggregated scores.
 *
 * - `none` (default) — tied entries keep the same rank (competition
 *   ranking). Order among ties is implementation-defined.
 * - `earliest` — among ties, the user whose earliest contributing
 *   event has the lower timestamp ranks higher (still shares the rank,
 *   but appears first in the result array).
 * - `user_id` — stable lexicographic tiebreaker by `user_id` ascending.
 */
export type TieBreak = 'none' | 'earliest' | 'user_id'

/**
 * Options accepted by {@link getLeaderboard} / {@link computeLeaderboard}.
 */
export interface LeaderboardOptions {
  /** Metric identifier, e.g. `'xp'`, `'lessons-completed'`, `'goals'`. */
  metric: string
  /** Window over which to aggregate. Named or custom. */
  window: LeaderboardWindow
  /**
   * Maximum entries returned (top-N). When omitted, all matching
   * entries are returned (still ranked).
   */
  limit?: number
  /**
   * Number of leading entries to skip (paginated top-N). Defaults to
   * `0`. Combined with `limit` this enables stable paging.
   */
  offset?: number
  /**
   * Optional scope partition. Two boards with different `scopeKey`
   * never see each other's events — useful for per-classroom,
   * per-cohort, or per-friend-group boards.
   */
  scopeKey?: string
  /**
   * Tie-break strategy. Defaults to `'none'`.
   */
  tieBreak?: TieBreak
  /**
   * Reference instant for resolving named windows (`daily`, `weekly`,
   * `monthly`). Defaults to `new Date()` at call time.
   */
  now?: Date
}

/**
 * A single recorded metric event used by the pure engine.
 */
export interface LeaderboardEvent {
  /** The user identifier. */
  user_id: string
  /** Score contribution for this event (any finite number). */
  value: number
  /** Event timestamp. */
  when: Date
  /**
   * Optional scope partition matching the {@link LeaderboardOptions.scopeKey}
   * supplied at query time. Events with a non-matching `scopeKey` are
   * filtered out.
   */
  scopeKey?: string
}

/**
 * Aggregation strategy for combining multiple events for the same user
 * within a window.
 *
 * - `sum` (default) — total of `value`s.
 * - `max` — highest single `value`.
 * - `count` — number of events (ignores `value`).
 * - `latest` — `value` of the most recent event.
 */
export type Aggregation = 'sum' | 'max' | 'count' | 'latest'

/**
 * Inputs for the pure {@link computeLeaderboard} engine.
 */
export interface ComputeInput {
  /** Events to aggregate. Pre-filtering by metric / scope is the caller's job. */
  events: LeaderboardEvent[]
  /** Engine options (window resolution, ranking, paging). */
  options: LeaderboardOptions
  /** Aggregation strategy. Defaults to `sum`. */
  aggregation?: Aggregation
}
