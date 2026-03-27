/**
 * Inventory types.
 *
 * @module
 */

/**
 *
 */
export interface Inventory {
  id: string
  createdAt: string
  updatedAt: string
  // TODO: Add fields
}

/**
 *
 */
export type CreateInventoryInput = Omit<Inventory, 'id' | 'createdAt' | 'updatedAt'>
/**
 *
 */
export type UpdateInventoryInput = Partial<CreateInventoryInput>
