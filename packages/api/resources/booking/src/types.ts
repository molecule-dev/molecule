/**
 * Booking types.
 *
 * @module
 */

/**
 *
 */
export interface Booking {
  id: string
  createdAt: string
  updatedAt: string
  // TODO: Add fields
}

/**
 *
 */
export type CreateBookingInput = Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>
/**
 *
 */
export type UpdateBookingInput = Partial<CreateBookingInput>
