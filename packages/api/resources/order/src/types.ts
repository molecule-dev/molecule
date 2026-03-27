/**
 * Order types.
 *
 * @module
 */

/**
 *
 */
export interface Order {
  id: string
  createdAt: string
  updatedAt: string
  // TODO: Add fields
}

/**
 *
 */
export type CreateOrderInput = Omit<Order, 'id' | 'createdAt' | 'updatedAt'>
/**
 *
 */
export type UpdateOrderInput = Partial<CreateOrderInput>
