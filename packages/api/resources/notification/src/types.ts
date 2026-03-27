/**
 * Notification types.
 *
 * @module
 */

/**
 *
 */
export interface Notification {
  id: string
  createdAt: string
  updatedAt: string
  // TODO: Add fields
}

/**
 *
 */
export type CreateNotificationInput = Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>
/**
 *
 */
export type UpdateNotificationInput = Partial<CreateNotificationInput>
