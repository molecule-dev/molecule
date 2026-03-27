/**
 * Review business logic service.
 *
 * Uses the abstract DataStore from `@molecule/api-database` for all
 * persistence — never raw SQL.
 *
 * @module
 */

import {
  count,
  create as dbCreate,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'

import type {
  CreateReviewInput,
  PaginatedResult,
  RatingStats,
  Review,
  ReviewHelpful,
  ReviewQuery,
  UpdateReviewInput,
} from './types.js'

const TABLE = 'reviews'
const HELPFUL_TABLE = 'review_helpful'

/**
 * Creates a new review on a resource. One review per user per resource.
 *
 * @param resourceType - The type of resource being reviewed.
 * @param resourceId - The ID of the resource being reviewed.
 * @param userId - The ID of the reviewing user.
 * @param data - The review creation input.
 * @returns The created review.
 */
export async function createReview(
  resourceType: string,
  resourceId: string,
  userId: string,
  data: CreateReviewInput,
): Promise<Review> {
  const result = await dbCreate<Review>(TABLE, {
    resourceType,
    resourceId,
    userId,
    rating: data.rating,
    title: data.title,
    body: data.body,
    helpful: 0,
  })
  return result.data!
}

/**
 * Retrieves paginated reviews for a resource with optional sorting.
 *
 * @param resourceType - The type of resource.
 * @param resourceId - The ID of the resource.
 * @param options - Query options (pagination and sorting).
 * @returns A paginated result of reviews.
 */
export async function getReviewsByResource(
  resourceType: string,
  resourceId: string,
  options: ReviewQuery = {},
): Promise<PaginatedResult<Review>> {
  const limit = options.limit ?? 20
  const offset = options.offset ?? 0
  const sortBy = options.sortBy ?? 'createdAt'
  const sortDirection = options.sortDirection ?? 'desc'

  const where = [
    { field: 'resourceType', operator: '=' as const, value: resourceType },
    { field: 'resourceId', operator: '=' as const, value: resourceId },
  ]

  const [data, total] = await Promise.all([
    findMany<Review>(TABLE, {
      where,
      orderBy: [{ field: sortBy, direction: sortDirection }],
      limit,
      offset,
    }),
    count(TABLE, where),
  ])

  return { data, total, limit, offset }
}

/**
 * Retrieves a single review by ID.
 *
 * @param reviewId - The review ID to look up.
 * @returns The review or `null` if not found.
 */
export async function getReviewById(reviewId: string): Promise<Review | null> {
  return findById<Review>(TABLE, reviewId)
}

/**
 * Updates a review. Only the review owner can update.
 *
 * @param reviewId - The review ID to update.
 * @param userId - The requesting user's ID (must match review owner).
 * @param data - The update input.
 * @returns The updated review or `null` if not found or unauthorized.
 */
export async function updateReview(
  reviewId: string,
  userId: string,
  data: UpdateReviewInput,
): Promise<Review | null> {
  const existing = await findById<Review>(TABLE, reviewId)
  if (!existing || existing.userId !== userId) return null

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (data.rating !== undefined) updates.rating = data.rating
  if (data.title !== undefined) updates.title = data.title
  if (data.body !== undefined) updates.body = data.body

  const result = await updateById<Review>(TABLE, reviewId, updates)
  return result.data
}

/**
 * Deletes a review. Only the review owner can delete.
 *
 * @param reviewId - The review ID to delete.
 * @param userId - The requesting user's ID (must match review owner).
 * @returns `true` if deleted, `false` if not found or unauthorized.
 */
export async function deleteReview(reviewId: string, userId: string): Promise<boolean> {
  const existing = await findById<Review>(TABLE, reviewId)
  if (!existing || existing.userId !== userId) return false

  await deleteById(TABLE, reviewId)
  return true
}

/**
 * Computes aggregate rating statistics for a resource.
 *
 * @param resourceType - The type of resource.
 * @param resourceId - The ID of the resource.
 * @returns Rating statistics including average, count, and distribution.
 */
export async function getAverageRating(
  resourceType: string,
  resourceId: string,
): Promise<RatingStats> {
  const where = [
    { field: 'resourceType', operator: '=' as const, value: resourceType },
    { field: 'resourceId', operator: '=' as const, value: resourceId },
  ]

  const reviews = await findMany<Review>(TABLE, { where })

  if (reviews.length === 0) {
    return { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
  }

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let sum = 0
  for (const review of reviews) {
    sum += review.rating
    distribution[review.rating] = (distribution[review.rating] || 0) + 1
  }

  return {
    average: Math.round((sum / reviews.length) * 10) / 10,
    count: reviews.length,
    distribution,
  }
}

/**
 * Marks a review as helpful by a user. Idempotent — duplicate votes are ignored.
 *
 * @param reviewId - The review to mark as helpful.
 * @param userId - The user marking it helpful.
 */
export async function markHelpful(reviewId: string, userId: string): Promise<void> {
  const review = await findById<Review>(TABLE, reviewId)
  if (!review) return

  const existing = await findOne<ReviewHelpful>(HELPFUL_TABLE, [
    { field: 'reviewId', operator: '=' as const, value: reviewId },
    { field: 'userId', operator: '=' as const, value: userId },
  ])

  if (existing) return

  await dbCreate(HELPFUL_TABLE, { reviewId, userId })
  await updateById(TABLE, reviewId, { helpful: review.helpful + 1 })
}
