/**
 * Notification center core types for molecule.dev.
 *
 * Defines the standard interfaces for in-app notification management
 * providers including CRUD, read status, and user preferences.
 *
 * @module
 */

/**
 * An in-app notification.
 */
export interface Notification {
  /** Provider-assigned notification identifier. */
  id: string

  /** The user this notification belongs to. */
  userId: string

  /** Notification category (e.g. 'system', 'message', 'alert'). */
  type: string

  /** Notification headline. */
  title: string

  /** Notification body text. */
  body: string

  /** Whether the notification has been read. */
  read: boolean

  /** Arbitrary structured data attached to the notification. */
  data?: Record<string, unknown>

  /** When the notification was created. */
  createdAt: Date
}

/**
 * Data required to create a new notification.
 */
export interface CreateNotification {
  /** Notification category. */
  type: string

  /** Notification headline. */
  title: string

  /** Notification body text. */
  body: string

  /** Arbitrary structured data to attach. */
  data?: Record<string, unknown>

  /** Delivery channels for this notification. Defaults to `['inApp']`. */
  channels?: ('inApp' | 'email' | 'push' | 'sms')[]
}

/**
 * A bulk notification targeting a specific user.
 */
export interface BulkNotification {
  /** The target user. */
  userId: string

  /** The notification to send. */
  notification: CreateNotification
}

/**
 * User notification preferences.
 */
export interface NotificationPreferences {
  /** Whether email notifications are enabled. */
  email: boolean

  /** Whether push notifications are enabled. */
  push: boolean

  /** Whether SMS notifications are enabled. */
  sms: boolean

  /** Per-channel or per-type overrides. */
  channels: Record<string, boolean>
}

/**
 * Query options for listing notifications.
 */
export interface NotificationQuery {
  /** Maximum number of results to return. */
  limit?: number

  /** Number of results to skip. */
  offset?: number

  /** Filter by read status. */
  read?: boolean

  /** Filter by notification type. */
  type?: string
}

/**
 * Paginated result set.
 */
export interface PaginatedResult<T> {
  /** The result items for this page. */
  items: T[]

  /** Total number of matching items. */
  total: number

  /** Number of items skipped. */
  offset: number

  /** Maximum items per page. */
  limit: number
}

/**
 * Notification center provider interface.
 *
 * All notification center providers must implement this interface to provide
 * in-app notification CRUD, read status management, and user preferences.
 */
export interface NotificationCenterProvider {
  /**
   * Sends a notification to a specific user.
   *
   * @param userId - The target user identifier.
   * @param notification - The notification to create.
   * @returns The created notification.
   */
  send(userId: string, notification: CreateNotification): Promise<Notification>

  /**
   * Sends notifications to multiple users in a single batch.
   *
   * @param notifications - Array of user-targeted notifications.
   * @returns The created notifications.
   */
  sendBulk(notifications: BulkNotification[]): Promise<Notification[]>

  /**
   * Retrieves all notifications for a user with optional filtering.
   *
   * @param userId - The user to retrieve notifications for.
   * @param options - Optional query filters and pagination.
   * @returns Paginated notification results.
   */
  getAll(userId: string, options?: NotificationQuery): Promise<PaginatedResult<Notification>>

  /**
   * Returns the count of unread notifications for a user.
   *
   * @param userId - The user to count unread notifications for.
   * @returns The unread notification count.
   */
  getUnreadCount(userId: string): Promise<number>

  /**
   * Marks a single notification as read.
   *
   * @param notificationId - The notification to mark as read.
   */
  markRead(notificationId: string): Promise<void>

  /**
   * Marks all notifications for a user as read.
   *
   * @param userId - The user whose notifications should be marked read.
   */
  markAllRead(userId: string): Promise<void>

  /**
   * Deletes a notification.
   *
   * @param notificationId - The notification to delete.
   */
  delete(notificationId: string): Promise<void>

  /**
   * Retrieves notification preferences for a user.
   *
   * @param userId - The user to retrieve preferences for.
   * @returns The user's notification preferences.
   */
  getPreferences(userId: string): Promise<NotificationPreferences>

  /**
   * Updates notification preferences for a user.
   *
   * @param userId - The user to update preferences for.
   * @param preferences - The preferences to merge.
   */
  setPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void>
}
