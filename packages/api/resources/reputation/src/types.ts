/**
 * Reputation resource type definitions.
 *
 * Per-user reputation/karma scoring with append-only event history,
 * derived levels via configurable thresholds, and idempotent badge
 * awards. The pure {@link computeLevel} function is fully testable
 * without any I/O; the service layer persists via the abstract
 * `@molecule/api-database` DataStore.
 *
 * @module
 */

/**
 * Default level thresholds — index `i` is the lower bound (inclusive)
 * for level `i`. Level `0` covers `score < 100`, level `1` covers
 * `100 <= score < 500`, and so on.
 *
 * Ordered ascending. Apps may pass their own thresholds to
 * {@link computeLevel} if a different curve is desired.
 */
export const DEFAULT_LEVEL_THRESHOLDS: readonly number[] = [0, 100, 500, 1000, 5000]

/**
 * Persisted reputation snapshot for a single user.
 */
export interface ReputationScore {
  /** The user identifier (PK). */
  userId: string
  /** Cumulative score across all recorded events. */
  score: number
  /** Derived level — see {@link DEFAULT_LEVEL_THRESHOLDS}. */
  level: number
  /** Timestamp of the last score-bumping event. */
  updatedAt: Date
}

/**
 * Append-only reputation event. The score table is the materialised
 * sum of all events for a user; events are retained for audit and
 * recompute scenarios.
 */
export interface ReputationEvent {
  /** Event identifier (UUID). */
  id: string
  /** The user whose reputation was affected. */
  userId: string
  /**
   * Domain-specific event kind (e.g. `vote`, `like`,
   * `accepted-solution`, `post`, `report-rejected`). Free-form string;
   * apps decide their own taxonomy.
   */
  kind: string
  /** Signed integer applied to the user's score. May be negative. */
  delta: number
  /**
   * Optional reference to the domain object that triggered the event
   * (e.g. a comment ID, post ID, vote ID). Used to deduplicate
   * recompute jobs and to power audit views.
   */
  sourceId?: string | null
  /**
   * Optional structured metadata (JSON). Persisted as-is by the
   * database bond; consumers should treat as opaque unless they
   * authored the event.
   */
  metadata?: Record<string, unknown> | null
  /** Event creation timestamp. */
  createdAt: Date
}

/**
 * Idempotent badge award. A user has at most one row per
 * `(userId, kind)` pair.
 */
export interface Badge {
  /** Badge identifier (UUID). */
  id: string
  /** The user the badge was awarded to. */
  userId: string
  /**
   * Badge kind (e.g. `first-post`, `top-1-percent`, `helpful-answer`).
   * Free-form; apps decide their own taxonomy.
   */
  kind: string
  /** Award timestamp. */
  awardedAt: Date
}

/**
 * Optional source descriptor for {@link ReputationEvent}s — accepted
 * as a single argument to keep the service signature ergonomic.
 */
export interface ReputationEventSource {
  /** Optional domain-object reference. */
  sourceId?: string
  /** Optional structured metadata. */
  metadata?: Record<string, unknown>
}
