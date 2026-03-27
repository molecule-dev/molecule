/**
 * Thread types.
 *
 * @module
 */

/**
 *
 */
export interface Thread {
  id: string
  createdAt: string
  updatedAt: string
  // TODO: Add fields
}

/**
 *
 */
export type CreateThreadInput = Omit<Thread, 'id' | 'createdAt' | 'updatedAt'>
/**
 *
 */
export type UpdateThreadInput = Partial<CreateThreadInput>
