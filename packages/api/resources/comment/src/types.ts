/**
 * Comment resource type definitions.
 *
 * Polymorphic comments that can attach to any resource type via
 * `resourceType` and `resourceId`. Supports threaded replies via `parentId`.
 *
 * @module
 */

/**
 * A comment attached to a resource, with optional threading via `parentId`.
 */
export interface Comment {
  /** Unique comment identifier. */
  id: string
  /** The type of resource this comment is attached to (e.g. 'project', 'post'). */
  resourceType: string
  /** The ID of the resource this comment is attached to. */
  resourceId: string
  /** The ID of the user who created this comment. */
  userId: string
  /** The parent comment ID for threaded replies, or `null` for top-level comments. */
  parentId: string | null
  /** The comment body text. */
  body: string
  /** When the comment was last edited, or `null` if never edited. */
  editedAt: string | null
  /** When the comment was created (ISO 8601). */
  createdAt: string
  /** When the comment was last updated (ISO 8601). */
  updatedAt: string
}

/**
 * Input for creating a new comment.
 */
export interface CreateCommentInput {
  /** The comment body text. */
  body: string
  /** Optional parent comment ID for threaded replies. */
  parentId?: string
}

/**
 * Input for updating an existing comment.
 */
export interface UpdateCommentInput {
  /** The updated comment body text. */
  body: string
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
