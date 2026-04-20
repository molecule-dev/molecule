/**
 * Notification center provider interface and related types.
 *
 * Defines framework-agnostic contracts for in-app notification center widgets
 * with support for paginated fetching, read/unread tracking, realtime updates,
 * polling, and subscription-based state change notifications.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Fetch & pagination
// ---------------------------------------------------------------------------

/**
 * Filter criteria for narrowing notification queries.
 */
export interface NotificationFilter {
  /** Filter by notification type (e.g. `'mention'`, `'comment'`). */
  type?: string
  /** Filter by read status. */
  read?: boolean
}

/**
 * Options for fetching a page of notifications.
 */
export interface FetchOptions {
  /** Opaque cursor for cursor-based pagination. `undefined` fetches the first page. */
  cursor?: string
  /** Maximum number of items to return per page. */
  limit?: number
  /** Optional filter criteria. */
  filter?: NotificationFilter
}

/**
 * A generic paginated result set.
 *
 * @template T - The type of items in the result set.
 */
export interface PaginatedResult<T> {
  /** The items for the current page. */
  items: T[]
  /** Cursor for fetching the next page. `undefined` when there are no more pages. */
  nextCursor?: string
  /** Whether more items are available beyond this page. */
  hasMore: boolean
  /** Optional total count of items across all pages. */
  total?: number
}

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

/**
 * A single in-app notification.
 */
export interface AppNotification {
  /** Unique identifier. */
  id: string
  /** Notification type key (e.g. `'mention'`, `'comment'`, `'invite'`). */
  type: string
  /** Short title for the notification (pass through i18n before setting). */
  title: string
  /** Body / description text (pass through i18n before setting). */
  body: string
  /** Whether the notification has been read. */
  read: boolean
  /** Optional URL the notification links to. */
  actionUrl?: string
  /** Optional avatar URL for the notification sender / actor. */
  avatar?: string
  /** Timestamp when the notification was created. */
  createdAt: Date
  /** Arbitrary metadata attached to the notification. */
  metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Realtime adapter
// ---------------------------------------------------------------------------

/**
 * Minimal realtime transport interface for receiving push notifications.
 *
 * Any object with `on` / `off` methods satisfies this contract — including
 * a realtime connection from the `@molecule/app-realtime` package.
 */
export interface NotificationRealtimeAdapter {
  /**
   * Registers a handler for an incoming event.
   *
   * @param event - The event name to listen for.
   * @param handler - The handler callback.
   */
  on(event: string, handler: (data: unknown) => void): void

  /**
   * Removes a handler for an event.
   *
   * @param event - The event name.
   * @param handler - The specific handler to remove (optional).
   */
  off(event: string, handler?: (data: unknown) => void): void
}

// ---------------------------------------------------------------------------
// State & update handler
// ---------------------------------------------------------------------------

/**
 * Snapshot of the notification center state, emitted to subscribers on change.
 */
export interface NotificationCenterState {
  /** Current list of loaded notifications. */
  notifications: AppNotification[]
  /** Current unread notification count. */
  unreadCount: number
  /** Whether a fetch operation is in progress. */
  loading: boolean
  /** Whether more notifications are available to load. */
  hasMore: boolean
}

/**
 * Handler invoked when the notification center state changes.
 *
 * @param state - The updated notification center state snapshot.
 */
export type NotificationUpdateHandler = (state: NotificationCenterState) => void

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/**
 * Configuration for creating a notification center instance.
 */
export interface NotificationCenterOptions {
  /**
   * Fetches a page of notifications.
   *
   * @param options - Pagination and filter options.
   * @returns A promise resolving to a paginated result of notifications.
   */
  fetchNotifications: (options: FetchOptions) => Promise<PaginatedResult<AppNotification>>

  /**
   * Fetches the current unread notification count.
   *
   * @returns A promise resolving to the unread count.
   */
  fetchUnreadCount: () => Promise<number>

  /**
   * Marks a single notification as read.
   *
   * @param notificationId - The id of the notification to mark as read.
   */
  markAsRead: (notificationId: string) => Promise<void>

  /** Marks all notifications as read. */
  markAllAsRead: () => Promise<void>

  /**
   * Called when a new notification is received (via polling or realtime).
   *
   * @param notification - The new notification.
   */
  onNotification?: (notification: AppNotification) => void

  /**
   * Polling interval in milliseconds for fetching new notifications.
   * Set to `0` or `undefined` to disable polling. Defaults to `0` (disabled).
   */
  pollInterval?: number

  /**
   * Optional realtime transport for receiving push notifications.
   * Any object satisfying {@link NotificationRealtimeAdapter} (e.g. a
   * `RealtimeConnection` from `@molecule/app-realtime`) can be used.
   */
  realtime?: NotificationRealtimeAdapter

  /**
   * The event name to listen for on the realtime adapter.
   * Defaults to `'notification'`.
   */
  realtimeEvent?: string
}

// ---------------------------------------------------------------------------
// Instance
// ---------------------------------------------------------------------------

/**
 * A live notification center instance exposing query, mutation, and
 * subscription methods.
 */
export interface NotificationCenterInstance {
  // -- Query ---------------------------------------------------------------

  /**
   * Returns the currently loaded notifications.
   *
   * @returns Array of notifications loaded so far.
   */
  getNotifications(): AppNotification[]

  /**
   * Returns the current unread notification count.
   *
   * @returns The unread count.
   */
  getUnreadCount(): number

  /**
   * Returns whether more notifications can be loaded.
   *
   * @returns `true` if additional pages are available.
   */
  hasMore(): boolean

  /**
   * Returns whether a fetch operation is currently in progress.
   *
   * @returns `true` if loading.
   */
  isLoading(): boolean

  // -- Actions -------------------------------------------------------------

  /**
   * Loads the next page of notifications (appends to the current list).
   */
  loadMore(): Promise<void>

  /**
   * Refreshes the notification list and unread count from scratch.
   */
  refresh(): Promise<void>

  /**
   * Marks a single notification as read.
   *
   * @param notificationId - The id of the notification to mark as read.
   */
  markAsRead(notificationId: string): Promise<void>

  /** Marks all notifications as read. */
  markAllAsRead(): Promise<void>

  // -- Subscriptions -------------------------------------------------------

  /**
   * Registers a handler that fires when the notification center state changes.
   *
   * @param handler - The update handler.
   */
  onUpdate(handler: NotificationUpdateHandler): void

  /**
   * Removes a previously registered update handler.
   *
   * @param handler - The handler to remove.
   */
  offUpdate(handler: NotificationUpdateHandler): void

  // -- Lifecycle -----------------------------------------------------------

  /**
   * Returns the current state snapshot.
   *
   * @returns The current {@link NotificationCenterState}.
   */
  getState(): NotificationCenterState

  /**
   * Releases resources held by the notification center instance
   * (stops polling, removes realtime listeners, clears subscriptions).
   */
  destroy(): void
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Contract that bond packages must implement to provide notification center
 * functionality.
 */
export interface NotificationCenterProvider {
  /**
   * Creates a new notification center instance from the given options.
   *
   * @param options - Notification center configuration.
   * @returns A notification center instance.
   */
  createNotificationCenter(options: NotificationCenterOptions): NotificationCenterInstance
}
