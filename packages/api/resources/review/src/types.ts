/**
 * Review types.
 *
 * @module
 */

/**
 *
 */
export interface Review {
  id: string
  createdAt: string
  updatedAt: string
  // TODO: Add fields
}

/**
 *
 */
export type CreateReviewInput = Omit<Review, 'id' | 'createdAt' | 'updatedAt'>
/**
 *
 */
export type UpdateReviewInput = Partial<CreateReviewInput>
