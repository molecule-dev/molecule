/**
 * Follow types.
 *
 * @module
 */

/**
 *
 */
export interface Follow {
  id: string
  createdAt: string
  updatedAt: string
  // TODO: Add fields
}

/**
 *
 */
export type CreateFollowInput = Omit<Follow, 'id' | 'createdAt' | 'updatedAt'>
/**
 *
 */
export type UpdateFollowInput = Partial<CreateFollowInput>
