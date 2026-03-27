/**
 * Bookmark types.
 *
 * @module
 */

/**
 *
 */
export interface Bookmark {
  id: string
  createdAt: string
  updatedAt: string
  // TODO: Add fields
}

/**
 *
 */
export type CreateBookmarkInput = Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>
/**
 *
 */
export type UpdateBookmarkInput = Partial<CreateBookmarkInput>
