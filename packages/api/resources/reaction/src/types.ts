/**
 * Reaction types.
 *
 * @module
 */

/**
 *
 */
export interface Reaction {
  id: string
  createdAt: string
  updatedAt: string
  // TODO: Add fields
}

/**
 *
 */
export type CreateReactionInput = Omit<Reaction, 'id' | 'createdAt' | 'updatedAt'>
/**
 *
 */
export type UpdateReactionInput = Partial<CreateReactionInput>
