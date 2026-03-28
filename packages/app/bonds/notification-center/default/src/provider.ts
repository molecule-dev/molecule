/**
 * Default implementation of the molecule NotificationCenterProvider.
 *
 * Manages in-memory notification state with support for paginated fetching,
 * read/unread tracking, polling, realtime push updates, and subscription-based
 * state change notifications. No external dependencies — pure TypeScript.
 *
 * @module
 */

import type {
  AppNotification,
  NotificationCenterInstance,
  NotificationCenterOptions,
  NotificationCenterProvider,
  NotificationCenterState,
  NotificationUpdateHandler,
} from '@molecule/app-notification-center'

import type { DefaultNotificationCenterConfig } from './types.js'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Creates a snapshot of the current notification center state.
 *
 * @param notifications - Current notification list.
 * @param unreadCount - Current unread count.
 * @param loading - Whether a fetch is in progress.
 * @param hasMore - Whether more pages are available.
 * @returns A frozen state snapshot.
 */
function createState(
  notifications: AppNotification[],
  unreadCount: number,
  loading: boolean,
  hasMore: boolean,
): NotificationCenterState {
  return { notifications: [...notifications], unreadCount, loading, hasMore }
}

// ---------------------------------------------------------------------------
// Instance factory
// ---------------------------------------------------------------------------

/**
 * Creates a NotificationCenterInstance managing notification state in memory.
 *
 * @param options - Notification center configuration from the core interface.
 * @param config - Optional provider-specific configuration.
 * @returns A NotificationCenterInstance.
 */
function createInstance(
  options: NotificationCenterOptions,
  config: DefaultNotificationCenterConfig = {},
): NotificationCenterInstance {
  const pageSize = config.defaultPageSize ?? 20
  const refreshUnreadOnPoll = config.refreshUnreadOnPoll ?? true

  let notifications: AppNotification[] = []
  let unreadCount = 0
  let loading = false
  let hasMorePages = true
  let nextCursor: string | undefined
  let destroyed = false

  const subscribers = new Set<NotificationUpdateHandler>()
  let pollTimer: ReturnType<typeof setInterval> | undefined
  let realtimeHandler: ((data: unknown) => void) | undefined

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Emits the current state to all subscribers.
   */
  function emit(): void {
    const state = createState(notifications, unreadCount, loading, hasMorePages)
    for (const handler of subscribers) {
      handler(state)
    }
  }

  /**
   * Validates that an incoming realtime payload looks like an AppNotification.
   *
   * @param data - The unknown incoming data.
   * @returns The validated AppNotification, or `undefined` if invalid.
   */
  function parseNotification(data: unknown): AppNotification | undefined {
    if (data === null || typeof data !== 'object') return undefined
    const obj = data as Record<string, unknown>
    if (typeof obj.id !== 'string' || typeof obj.title !== 'string') return undefined

    return {
      id: obj.id,
      type: typeof obj.type === 'string' ? obj.type : '',
      title: obj.title,
      body: typeof obj.body === 'string' ? obj.body : '',
      read: typeof obj.read === 'boolean' ? obj.read : false,
      actionUrl: typeof obj.actionUrl === 'string' ? obj.actionUrl : undefined,
      avatar: typeof obj.avatar === 'string' ? obj.avatar : undefined,
      createdAt: obj.createdAt instanceof Date ? obj.createdAt : new Date(obj.createdAt as string),
      metadata:
        typeof obj.metadata === 'object' && obj.metadata !== null
          ? (obj.metadata as Record<string, unknown>)
          : undefined,
    }
  }

  /**
   * Handles an incoming realtime notification.
   *
   * @param data - Raw data from the realtime adapter.
   */
  function handleRealtimeNotification(data: unknown): void {
    if (destroyed) return
    const notification = parseNotification(data)
    if (!notification) return

    // Prepend to front (newest first), avoid duplicates
    if (!notifications.some((n) => n.id === notification.id)) {
      notifications = [notification, ...notifications]
      if (!notification.read) {
        unreadCount++
      }
      options.onNotification?.(notification)
      emit()
    }
  }

  // -------------------------------------------------------------------------
  // Polling
  // -------------------------------------------------------------------------

  /**
   * Executes a single poll cycle: fetches the latest page and refreshes
   * the unread count.
   */
  async function poll(): Promise<void> {
    if (destroyed) return

    try {
      // Fetch first page to detect new notifications
      const result = await options.fetchNotifications({ limit: pageSize })

      // Identify new notifications not already in the list
      const existingIds = new Set(notifications.map((n) => n.id))
      const newOnes = result.items.filter((n) => !existingIds.has(n.id))

      if (newOnes.length > 0) {
        notifications = [...newOnes, ...notifications]
        for (const n of newOnes) {
          options.onNotification?.(n)
        }
      }

      if (refreshUnreadOnPoll) {
        unreadCount = await options.fetchUnreadCount()
      }

      emit()
    } catch {
      // Polling failures are silent — next poll will retry
    }
  }

  /**
   * Starts the poll timer if a valid interval is configured.
   */
  function startPolling(): void {
    if (options.pollInterval && options.pollInterval > 0 && !destroyed) {
      pollTimer = setInterval(() => void poll(), options.pollInterval)
    }
  }

  /**
   * Stops the poll timer.
   */
  function stopPolling(): void {
    if (pollTimer !== undefined) {
      clearInterval(pollTimer)
      pollTimer = undefined
    }
  }

  // -------------------------------------------------------------------------
  // Realtime setup
  // -------------------------------------------------------------------------

  if (options.realtime) {
    const eventName = options.realtimeEvent ?? 'notification'
    realtimeHandler = handleRealtimeNotification
    options.realtime.on(eventName, realtimeHandler)
  }

  // Start polling
  startPolling()

  // -------------------------------------------------------------------------
  // Instance
  // -------------------------------------------------------------------------

  const instance: NotificationCenterInstance = {
    // -- Query ---------------------------------------------------------------

    getNotifications(): AppNotification[] {
      return [...notifications]
    },

    getUnreadCount(): number {
      return unreadCount
    },

    hasMore(): boolean {
      return hasMorePages
    },

    isLoading(): boolean {
      return loading
    },

    // -- Actions -------------------------------------------------------------

    async loadMore(): Promise<void> {
      if (loading || !hasMorePages || destroyed) return

      loading = true
      emit()

      try {
        const result = await options.fetchNotifications({
          cursor: nextCursor,
          limit: pageSize,
        })

        // Deduplicate against existing notifications
        const existingIds = new Set(notifications.map((n) => n.id))
        const newItems = result.items.filter((n) => !existingIds.has(n.id))

        notifications = [...notifications, ...newItems]
        nextCursor = result.nextCursor
        hasMorePages = result.hasMore
      } catch {
        // loadMore failures are non-fatal — consumer can retry
      } finally {
        loading = false
        emit()
      }
    },

    async refresh(): Promise<void> {
      if (destroyed) return

      loading = true
      notifications = []
      nextCursor = undefined
      hasMorePages = true
      emit()

      try {
        const [result, count] = await Promise.all([
          options.fetchNotifications({ limit: pageSize }),
          options.fetchUnreadCount(),
        ])

        notifications = result.items
        nextCursor = result.nextCursor
        hasMorePages = result.hasMore
        unreadCount = count
      } catch {
        // refresh failures are non-fatal
      } finally {
        loading = false
        emit()
      }
    },

    async markAsRead(notificationId: string): Promise<void> {
      if (destroyed) return

      await options.markAsRead(notificationId)

      const notification = notifications.find((n) => n.id === notificationId)
      if (notification && !notification.read) {
        notification.read = true
        unreadCount = Math.max(0, unreadCount - 1)
        emit()
      }
    },

    async markAllAsRead(): Promise<void> {
      if (destroyed) return

      await options.markAllAsRead()

      for (const notification of notifications) {
        notification.read = true
      }
      unreadCount = 0
      emit()
    },

    // -- Subscriptions -------------------------------------------------------

    onUpdate(handler: NotificationUpdateHandler): void {
      subscribers.add(handler)
    },

    offUpdate(handler: NotificationUpdateHandler): void {
      subscribers.delete(handler)
    },

    // -- Lifecycle -----------------------------------------------------------

    getState(): NotificationCenterState {
      return createState(notifications, unreadCount, loading, hasMorePages)
    },

    destroy(): void {
      if (destroyed) return
      destroyed = true

      stopPolling()

      if (options.realtime && realtimeHandler) {
        const eventName = options.realtimeEvent ?? 'notification'
        options.realtime.off(eventName, realtimeHandler)
        realtimeHandler = undefined
      }

      subscribers.clear()
      notifications = []
      unreadCount = 0
      hasMorePages = false
      loading = false
    },
  }

  return instance
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Creates a default notification center provider.
 *
 * @param config - Optional provider-specific configuration.
 * @returns A `NotificationCenterProvider` backed by in-memory state management.
 *
 * @example
 * ```typescript
 * import { createDefaultProvider } from '@molecule/app-notification-center-default'
 * import { setProvider } from '@molecule/app-notification-center'
 *
 * setProvider(createDefaultProvider())
 * ```
 */
export function createDefaultProvider(
  config: DefaultNotificationCenterConfig = {},
): NotificationCenterProvider {
  return {
    createNotificationCenter(options: NotificationCenterOptions): NotificationCenterInstance {
      return createInstance(options, config)
    },
  }
}

/** Default notification center provider instance. */
export const provider: NotificationCenterProvider = createDefaultProvider()
