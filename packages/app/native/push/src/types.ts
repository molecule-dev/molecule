/**
 * Push notification types for molecule.dev.
 *
 * @module
 */

/**
 * Push notification permission status.
 */
export type PermissionStatus = 'granted' | 'denied' | 'default' | 'prompt'

/**
 * Push notification payload.
 */
export interface PushNotification {
  /**
   * Notification ID.
   */
  id: string

  /**
   * Notification title.
   */
  title: string

  /**
   * Notification body/message.
   */
  body?: string

  /**
   * Notification data payload.
   */
  data?: Record<string, unknown>

  /**
   * Badge count.
   */
  badge?: number

  /**
   * Sound to play.
   */
  sound?: string

  /**
   * Icon URL.
   */
  icon?: string

  /**
   * Image URL.
   */
  image?: string

  /**
   * Click action/URL.
   */
  clickAction?: string

  /**
   * Notification tag (for grouping).
   */
  tag?: string

  /**
   * Whether the notification requires interaction.
   */
  requireInteraction?: boolean

  /**
   * Notification timestamp.
   */
  timestamp?: number

  /**
   * Notification actions (buttons).
   */
  actions?: PushNotificationAction[]
}

/**
 * Notification action button.
 */
export interface PushNotificationAction {
  /**
   * Action ID.
   */
  id: string

  /**
   * Action title.
   */
  title: string

  /**
   * Action icon.
   */
  icon?: string
}

/**
 * Push token info.
 */
export interface PushToken {
  /**
   * Token value.
   */
  value: string

  /**
   * Platform the token is for.
   */
  platform: 'web' | 'ios' | 'android'

  /**
   * When the token was obtained.
   */
  timestamp: number
}

/**
 * Notification received event.
 */
export interface NotificationReceivedEvent {
  /**
   * The notification.
   */
  notification: PushNotification

  /**
   * Whether the app was in foreground.
   */
  foreground: boolean
}

/**
 * Notification action event.
 */
export interface NotificationActionEvent {
  /**
   * The notification.
   */
  notification: PushNotification

  /**
   * Action that was triggered.
   */
  actionId?: string
}

/**
 * Listener invoked when a push notification is received.
 * @param event - The received notification and foreground state.
 */
export type NotificationReceivedListener = (event: NotificationReceivedEvent) => void
/**
 * Notification Action Listener type.
 */
export type NotificationActionListener = (event: NotificationActionEvent) => void
/**
 * Token Change Listener type.
 */
export type TokenChangeListener = (token: PushToken) => void

/**
 * Options for scheduling a local notification.
 */
export interface LocalNotificationOptions {
  /**
   * Notification ID.
   */
  id?: string

  /**
   * Notification title.
   */
  title: string

  /**
   * Notification body.
   */
  body?: string

  /**
   * Schedule at a specific time.
   */
  at?: Date

  /**
   * Repeat interval.
   */
  repeat?: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'

  /**
   * Extra data.
   */
  extra?: Record<string, unknown>

  /**
   * Sound to play.
   */
  sound?: string

  /**
   * Badge count.
   */
  badge?: number

  /**
   * Notification channel (Android).
   */
  channelId?: string

  /**
   * Actions/buttons.
   */
  actions?: PushNotificationAction[]
}

/**
 * Push notifications provider interface.
 *
 * All push providers must implement this interface.
 */
export interface PushProvider {
  /**
   * Checks the current permission status.
   */
  checkPermission(): Promise<PermissionStatus>

  /**
   * Requests notification permission.
   */
  requestPermission(): Promise<PermissionStatus>

  /**
   * Registers for push notifications and gets a token.
   */
  register(): Promise<PushToken>

  /**
   * Unregisters from push notifications.
   */
  unregister(): Promise<void>

  /**
   * Gets the current push token.
   * @returns The current token, or `null` if not registered.
   */
  getToken(): Promise<PushToken | null>

  /**
   * Subscribes to notification received events.
   */
  onNotificationReceived(listener: NotificationReceivedListener): () => void

  /**
   * Subscribes to notification action events (taps, button clicks).
   */
  onNotificationAction(listener: NotificationActionListener): () => void

  /**
   * Subscribes to token changes.
   */
  onTokenChange(listener: TokenChangeListener): () => void

  /**
   * Schedules a local notification.
   */
  scheduleLocal(options: LocalNotificationOptions): Promise<string>

  /**
   * Cancels a local notification.
   */
  cancelLocal(id: string): Promise<void>

  /**
   * Cancels all local notifications.
   */
  cancelAllLocal(): Promise<void>

  /**
   * Gets pending local notifications.
   */
  getPendingLocal(): Promise<LocalNotificationOptions[]>

  /**
   * Gets delivered notifications.
   */
  getDelivered(): Promise<PushNotification[]>

  /**
   * Removes delivered notifications.
   */
  removeDelivered(ids: string[]): Promise<void>

  /**
   * Removes all delivered notifications.
   */
  removeAllDelivered(): Promise<void>

  /**
   * Sets the badge count.
   */
  setBadge(count: number): Promise<void>

  /**
   * Gets the badge count.
   */
  getBadge(): Promise<number>

  /**
   * Clears the badge.
   */
  clearBadge(): Promise<void>

  /**
   * Destroys the provider.
   */
  destroy(): void
}
