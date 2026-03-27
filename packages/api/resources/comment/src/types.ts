/**
 * Comment types.
 *
 * @module
 */

/**
 *
 */
export interface Comment {
  id: string
  createdAt: string
  updatedAt: string
  // TODO: Add fields
}

/**
 *
 */
export type CreateCommentInput = Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>
/**
 *
 */
export type UpdateCommentInput = Partial<CreateCommentInput>
