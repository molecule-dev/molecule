/**
 * Review resource type definitions.
 *
 * Polymorphic reviews that can attach to any resource type via
 * `resourceType` and `resourceId`. Supports star ratings, titles,
 * and helpfulness voting.
 *
 * @module
 */

/**
 * A review attached to a resource, with a numeric rating and optional body.
 */
export interface Review {
  /** Unique review identifier. */
  id: string
  /** The type of resource this review is attached to (e.g. 'product', 'course'). */
  resourceType: string
  /** The ID of the resource this review is attached to. */
  resourceId: string
  /** The ID of the user who created this review. */
  userId: string
  /** Numeric rating (1–5). */
  rating: number
  /** Short review title/summary. */
  title: string
  /** Detailed review body text. */
  body: string
  /** Number of users who marked this review as helpful. */
  helpful: number
  /** When the review was created (ISO 8601). */
  createdAt: string
  /** When the review was last updated (ISO 8601). */
  updatedAt: string
}

/**
 * Input for creating a new review.
 */
export interface CreateReviewInput {
  /** Numeric rating (1–5). */
  rating: number
  /** Short review title/summary. */
  title: string
  /** Detailed review body text. */
  body: string
}

/**
 * Input for updating an existing review.
 */
export interface UpdateReviewInput {
  /** Updated numeric rating (1–5). */
  rating?: number
  /** Updated review title. */
  title?: string
  /** Updated review body text. */
  body?: string
}

/**
 * Aggregate rating statistics for a resource.
 */
export interface RatingStats {
  /** Average rating across all reviews. */
  average: number
  /** Total number of reviews. */
  count: number
  /** Breakdown of reviews by star rating (1–5). */
  distribution: Record<number, number>
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
 * Query options for listing reviews with optional sorting.
 */
export interface ReviewQuery extends PaginationOptions {
  /** Sort field. Defaults to 'createdAt'. */
  sortBy?: 'createdAt' | 'rating' | 'helpful'
  /** Sort direction. Defaults to 'desc'. */
  sortDirection?: 'asc' | 'desc'
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
 * A record of a user marking a review as helpful.
 */
export interface ReviewHelpful {
  /** The review that was marked helpful. */
  reviewId: string
  /** The user who marked it helpful. */
  userId: string
  /** When it was marked helpful (ISO 8601). */
  createdAt: string
}
