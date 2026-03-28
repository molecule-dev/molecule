/**
 * Activity feed type definitions.
 *
 * Activities represent actions taken by users on resources (e.g. "user-1 created post-42").
 * The feed provides a timeline of activities for a user, with seen-tracking for
 * unseen-count badges.
 *
 * @module
 */

/**
 * A single activity entry in the feed.
 */
export interface Activity {
  /** Unique activity identifier. */
  id: string
  /** The ID of the user who performed the action. */
  actorId: string
  /** The action that was performed (e.g. 'created', 'updated', 'commented'). */
  action: string
  /** The type of resource the action was performed on (e.g. 'post', 'project'). */
  resourceType: string
  /** The ID of the resource the action was performed on. */
  resourceId: string
  /** Optional metadata associated with the activity. */
  metadata: Record<string, unknown> | null
  /** When the activity was created (ISO 8601). */
  createdAt: string
}

/**
 * Input for logging a new activity.
 */
export interface CreateActivityInput {
  /** The ID of the user who performed the action. */
  actorId: string
  /** The action that was performed. */
  action: string
  /** The type of resource the action was performed on. */
  resourceType: string
  /** The ID of the resource the action was performed on. */
  resourceId: string
  /** Optional metadata associated with the activity. */
  metadata?: Record<string, unknown>
}

/**
 * Tracks the last-seen activity position for a user.
 */
export interface ActivitySeenStatus {
  /** The user ID. */
  userId: string
  /** The ID of the last activity seen by this user. */
  lastSeenActivityId: string
  /** When this seen status was last updated (ISO 8601). */
  updatedAt: string
}

/**
 * Options for paginated queries.
 */
export interface PaginationOptions {
  /** Maximum number of results to return. */
  limit?: number
  /** Number of results to skip. */
  offset?: number
}

/**
 * A paginated result set.
 */
export interface PaginatedResult<T> {
  /** The result items for the current page. */
  data: T[]
  /** Total number of matching items across all pages. */
  total: number
  /** Maximum number of results per page. */
  limit: number
  /** Number of results skipped. */
  offset: number
}

/**
 * Options for querying a user's activity feed.
 */
export interface FeedQuery extends PaginationOptions {
  /** Filter to only activities involving this resource type. */
  resourceType?: string
  /** Filter to only activities with this action. */
  action?: string
}
