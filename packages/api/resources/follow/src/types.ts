/**
 * Follow resource type definitions.
 *
 * Polymorphic follow/unfollow system for users or any resource type.
 *
 * @module
 */

/**
 * A follow relationship between a user and a target resource.
 */
export interface Follow {
  /** Unique follow identifier. */
  id: string
  /** The ID of the user who is following. */
  followerId: string
  /** The type of target being followed (e.g. 'user', 'project'). */
  targetType: string
  /** The ID of the target being followed. */
  targetId: string
  /** When the follow was created (ISO 8601). */
  createdAt: string
  /** When the follow was last updated (ISO 8601). */
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
