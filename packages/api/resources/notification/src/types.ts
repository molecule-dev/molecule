/**
 * Notification resource types.
 *
 * Re-exports core types from `@molecule/api-notification-center` and defines
 * request-specific types for the notification resource handlers.
 *
 * @module
 */

export type {
  CreateNotification,
  Notification,
  NotificationPreferences,
  NotificationQuery,
  PaginatedResult,
} from '@molecule/api-notification-center'

/**
 * Express request with authenticated user context.
 */
export interface AuthenticatedUser {
  /** The authenticated user's identifier. */
  id: string
}
