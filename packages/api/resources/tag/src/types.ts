/**
 * Tag types.
 *
 * @module
 */

/**
 *
 */
export interface Tag {
  id: string
  createdAt: string
  updatedAt: string
  // TODO: Add fields
}

/**
 *
 */
export type CreateTagInput = Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>
/**
 *
 */
export type UpdateTagInput = Partial<CreateTagInput>
