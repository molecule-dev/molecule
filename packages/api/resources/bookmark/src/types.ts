/**
 * Bookmark resource type definitions.
 *
 * User bookmarks that can reference any resource type. Supports optional
 * folder organization.
 *
 * @module
 */

/**
 * A bookmark linking a user to a resource, with optional folder grouping.
 */
export interface Bookmark {
  /** Unique bookmark identifier. */
  id: string
  /** The ID of the user who created the bookmark. */
  userId: string
  /** The type of resource bookmarked (e.g. 'post', 'project'). */
  resourceType: string
  /** The ID of the bookmarked resource. */
  resourceId: string
  /** Optional folder name for organizing bookmarks. */
  folder: string | null
  /** When the bookmark was created (ISO 8601). */
  createdAt: string
  /** When the bookmark was last updated (ISO 8601). */
  updatedAt: string
}

/**
 * Query options for listing bookmarks.
 */
export interface BookmarkQuery {
  /** Filter by resource type. */
  resourceType?: string
  /** Filter by folder name. */
  folder?: string
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
