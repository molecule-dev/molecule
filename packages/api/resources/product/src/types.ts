/**
 * Product types.
 *
 * @module
 */

/**
 *
 */
export interface Product {
  id: string
  createdAt: string
  updatedAt: string
  // TODO: Add fields
}

/**
 *
 */
export type CreateProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
/**
 *
 */
export type UpdateProductInput = Partial<CreateProductInput>
