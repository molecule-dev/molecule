/**
 * Cart types.
 *
 * @module
 */

/**
 *
 */
export interface Cart {
  id: string
  createdAt: string
  updatedAt: string
  // TODO: Add fields
}

/**
 *
 */
export type CreateCartInput = Omit<Cart, 'id' | 'createdAt' | 'updatedAt'>
/**
 *
 */
export type UpdateCartInput = Partial<CreateCartInput>
