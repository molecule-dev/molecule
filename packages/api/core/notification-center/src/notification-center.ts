/**
 * Notification center convenience functions that delegate to the bonded provider.
 *
 * @module
 */

import { getProvider } from './provider.js'
import type {
  BulkNotification,
  CreateNotification,
  Notification,
  NotificationPreferences,
  NotificationQuery,
  PaginatedResult,
} from './types.js'

/**
 * Sends a notification to a specific user.
 *
 * @param userId - The target user identifier.
 * @param notification - The notification to create.
 * @returns The created notification.
 * @throws {Error} If no notification center provider has been bonded.
 */
export const send = async (
  userId: string,
  notification: CreateNotification,
): Promise<Notification> => {
  return getProvider().send(userId, notification)
}

/**
 * Sends notifications to multiple users in a single batch.
 *
 * @param notifications - Array of user-targeted notifications.
 * @returns The created notifications.
 * @throws {Error} If no notification center provider has been bonded.
 */
export const sendBulk = async (notifications: BulkNotification[]): Promise<Notification[]> => {
  return getProvider().sendBulk(notifications)
}

/**
 * Retrieves all notifications for a user with optional filtering.
 *
 * @param userId - The user to retrieve notifications for.
 * @param options - Optional query filters and pagination.
 * @returns Paginated notification results.
 * @throws {Error} If no notification center provider has been bonded.
 */
export const getAll = async (
  userId: string,
  options?: NotificationQuery,
): Promise<PaginatedResult<Notification>> => {
  return getProvider().getAll(userId, options)
}

/**
 * Returns the count of unread notifications for a user.
 *
 * @param userId - The user to count unread notifications for.
 * @returns The unread notification count.
 * @throws {Error} If no notification center provider has been bonded.
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
  return getProvider().getUnreadCount(userId)
}

/**
 * Marks a single notification as read.
 *
 * @param notificationId - The notification to mark as read.
 * @returns Resolves when the notification has been marked read.
 * @throws {Error} If no notification center provider has been bonded.
 */
export const markRead = async (notificationId: string): Promise<void> => {
  return getProvider().markRead(notificationId)
}

/**
 * Marks all notifications for a user as read.
 *
 * @param userId - The user whose notifications should be marked read.
 * @returns Resolves when all notifications have been marked read.
 * @throws {Error} If no notification center provider has been bonded.
 */
export const markAllRead = async (userId: string): Promise<void> => {
  return getProvider().markAllRead(userId)
}

/**
 * Deletes a notification.
 *
 * @param notificationId - The notification to delete.
 * @returns Resolves when the notification has been deleted.
 * @throws {Error} If no notification center provider has been bonded.
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  return getProvider().delete(notificationId)
}

/**
 * Retrieves notification preferences for a user.
 *
 * @param userId - The user to retrieve preferences for.
 * @returns The user's notification preferences.
 * @throws {Error} If no notification center provider has been bonded.
 */
export const getPreferences = async (userId: string): Promise<NotificationPreferences> => {
  return getProvider().getPreferences(userId)
}

/**
 * Updates notification preferences for a user.
 *
 * @param userId - The user to update preferences for.
 * @param preferences - The preferences to merge.
 * @returns Resolves when preferences have been updated.
 * @throws {Error} If no notification center provider has been bonded.
 */
export const setPreferences = async (
  userId: string,
  preferences: Partial<NotificationPreferences>,
): Promise<void> => {
  return getProvider().setPreferences(userId, preferences)
}
