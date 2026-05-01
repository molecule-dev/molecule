/**
 * Streak resource type definitions.
 *
 * Per-user, per-activity streak tracking. A streak counts consecutive
 * "active" periods (24h windows by default) where the user performed
 * an activity. Tier-gated freezes can absorb a single missed period
 * without resetting the streak.
 *
 * @module
 */

/**
 * Streak configuration for a given activity kind.
 *
 * Configuration is supplied at call time — the engine itself is
 * stateless. Apps can persist their own config table or use static
 * constants per `activity_kind`.
 */
export interface StreakConfig {
  /** Identifier for the activity kind (e.g. 'login', 'lesson', 'workout'). */
  activity_kind: string
  /**
   * Hours of inactivity before the streak resets. Default `24` —
   * a streak resets if no activity is recorded for >24h after the
   * last activity timestamp.
   */
  reset_after_hours?: number
  /**
   * Optional cap on freezes a user may auto-consume to absorb a gap.
   * `0` (default) disables freezes entirely.
   */
  freezes_per_period?: number
}

/**
 * Persisted streak state for a single (user, activity_kind) pair.
 */
export interface StreakState {
  /** The user identifier. */
  user_id: string
  /** The activity kind this streak is tracking. */
  activity_kind: string
  /** Current consecutive-period count. Resets to `1` on a fresh start. */
  current_streak: number
  /** Best historical streak for this user + activity. */
  longest_streak: number
  /**
   * Timestamp of the most recent recorded activity, or `null` when no
   * activity has ever been recorded.
   */
  last_activity_date: Date | null
  /** Number of freezes the user has consumed in the current period. */
  freezes_used: number
}

/**
 * Pure-engine input describing a prior streak snapshot plus a new event.
 */
export interface StreakUpdateInput {
  /**
   * Previous persisted state, or `null` when the user has no prior
   * record for this activity kind.
   */
  previous: StreakState | null
  /** Configuration for this activity kind. */
  config: StreakConfig
  /** Timestamp of the activity event being recorded. */
  when: Date
}

/**
 * Result of a streak computation — the next state plus flags signalling
 * whether a freeze was consumed or the streak was reset.
 */
export interface StreakUpdateResult {
  /** Next persisted state to write back. */
  state: StreakState
  /**
   * `true` when a freeze was consumed to absorb a missed period.
   * `false` for first-record, same-period, in-window, or reset events.
   */
  freezeConsumed: boolean
  /**
   * `true` when the gap exceeded the reset window and the streak was
   * reset (with no available freeze).
   */
  reset: boolean
}
