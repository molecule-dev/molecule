/**
 * React Native push notifications provider using expo-notifications.
 *
 * Implements the PushProvider interface from `@molecule/app-push`.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'
import { getLogger } from '@molecule/app-logger'
import type {
  LocalNotificationOptions,
  NotificationActionEvent,
  NotificationActionListener,
  NotificationReceivedEvent,
  NotificationReceivedListener,
  PermissionStatus,
  PushNotification,
  PushProvider,
  PushToken,
  TokenChangeListener,
} from '@molecule/app-push'

import type { ReactNativePushConfig } from './types.js'

/** Minimal notification content shape from expo-notifications. */
interface ExpoNotificationContent {
  title: string | null
  body: string | null
  data: Record<string, unknown>
  badge: number | null
  sound: string | { [key: string]: string } | null
}

/** Minimal notification request shape from expo-notifications. */
interface ExpoNotificationRequest {
  identifier: string
  content: ExpoNotificationContent
}

/** Minimal notification shape from expo-notifications. */
interface ExpoNotification {
  request: ExpoNotificationRequest
}

/** Minimal notification response shape from expo-notifications. */
interface ExpoNotificationResponse {
  notification: ExpoNotification
  actionIdentifier: string
}

/** Minimal push token data shape from expo-notifications. */
interface ExpoPushTokenData {
  data: string
}

/** Minimal DevicePushToken shape from expo-notifications. */
interface ExpoDevicePushToken {
  data: string | object
}

/** Minimal scheduled notification shape from expo-notifications. */
interface ExpoScheduledNotification {
  identifier: string
  content: ExpoNotificationContent
}

/** Subscription handle from expo-notifications. */
interface ExpoSubscription {
  remove(): void
}

/** Minimal shape of the expo-notifications module used by this provider. */
interface ExpoNotificationsModule {
  getPermissionsAsync(): Promise<{ status: string }>
  requestPermissionsAsync(): Promise<{ status: string }>
  getExpoPushTokenAsync(): Promise<ExpoPushTokenData>
  setNotificationHandler(handler: {
    handleNotification: (notification: ExpoNotification) => Promise<{
      shouldShowAlert: boolean
      shouldPlaySound: boolean
      shouldSetBadge: boolean
    }>
  }): void
  addNotificationReceivedListener(
    callback: (notification: ExpoNotification) => void,
  ): ExpoSubscription
  addNotificationResponseReceivedListener(
    callback: (response: ExpoNotificationResponse) => void,
  ): ExpoSubscription
  addPushTokenListener(callback: (tokenData: ExpoDevicePushToken) => void): ExpoSubscription
  scheduleNotificationAsync(request: {
    content: {
      title: string
      body?: string
      data?: Record<string, unknown>
      sound?: boolean
      badge?: number
    }
    trigger: { date: Date } | null
  }): Promise<string>
  cancelScheduledNotificationAsync(id: string): Promise<void>
  cancelAllScheduledNotificationsAsync(): Promise<void>
  getAllScheduledNotificationsAsync(): Promise<ExpoScheduledNotification[]>
  getPresentedNotificationsAsync(): Promise<ExpoNotification[]>
  dismissNotificationAsync(id: string): Promise<void>
  dismissAllNotificationsAsync(): Promise<void>
  setBadgeCountAsync(count: number): Promise<boolean>
  getBadgeCountAsync(): Promise<number>
}

/**
 * Dynamically loads expo-notifications.
 * @returns The expo-notifications module.
 */
async function getExpoNotifications(): Promise<ExpoNotificationsModule> {
  try {
    // @ts-expect-error — expo-notifications is a peer dependency loaded at runtime
    return (await import('expo-notifications')) as unknown as ExpoNotificationsModule
  } catch {
    throw new Error(
      t(
        'push.error.missingDependency',
        { library: 'expo-notifications' },
        {
          defaultValue:
            'expo-notifications is required but not installed. Install it with: npx expo install expo-notifications',
        },
      ),
    )
  }
}

/**
 * Maps Expo permission status to molecule PermissionStatus.
 * @param status - The Expo permission status string.
 * @returns The normalized molecule PermissionStatus.
 */
function mapPermissionStatus(status: string): PermissionStatus {
  switch (status) {
    case 'granted':
      return 'granted'
    case 'denied':
      return 'denied'
    case 'undetermined':
      return 'default'
    default:
      return 'default'
  }
}

/**
 * Creates a React Native push notifications provider backed by expo-notifications.
 *
 * @param config - Optional provider configuration.
 * @returns A PushProvider implementation for React Native.
 */
export function createReactNativePushProvider(config: ReactNativePushConfig = {}): PushProvider {
  const { handleForeground = true } = config
  const logger = getLogger('push')
  const subscriptions: Array<{ remove(): void }> = []
  let currentToken: PushToken | null = null

  // Detect platform at runtime instead of hardcoding
  let runtimePlatform: 'ios' | 'android' | 'web' = 'android'
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Platform } = require('react-native') as { Platform: { OS: string } }
    runtimePlatform = Platform.OS as 'ios' | 'android' | 'web'
  } catch {
    // Fallback to android if react-native is not available
  }

  const provider: PushProvider = {
    async checkPermission(): Promise<PermissionStatus> {
      const Notifications = await getExpoNotifications()
      const { status } = await Notifications.getPermissionsAsync()
      return mapPermissionStatus(status)
    },

    async requestPermission(): Promise<PermissionStatus> {
      const Notifications = await getExpoNotifications()
      const { status } = await Notifications.requestPermissionsAsync()
      return mapPermissionStatus(status)
    },

    async register(): Promise<PushToken> {
      const Notifications = await getExpoNotifications()
      const tokenData = await Notifications.getExpoPushTokenAsync()
      const token: PushToken = {
        value: tokenData.data,
        platform: runtimePlatform,
        timestamp: Date.now(),
      }
      currentToken = token
      logger.debug('Push token registered', token.value)
      return token
    },

    async unregister(): Promise<void> {
      currentToken = null
    },

    async getToken(): Promise<PushToken | null> {
      return currentToken
    },

    onNotificationReceived(listener: NotificationReceivedListener): () => void {
      let subscription: { remove(): void } | undefined

      void getExpoNotifications()
        .then((notifications) => {
          if (handleForeground) {
            notifications.setNotificationHandler({
              handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
              }),
            })
          }

          subscription = notifications.addNotificationReceivedListener(
            (notification: ExpoNotification) => {
              const event: NotificationReceivedEvent = {
                notification: {
                  id: notification.request.identifier,
                  title: notification.request.content.title ?? '',
                  body: notification.request.content.body ?? undefined,
                  data: notification.request.content.data as Record<string, unknown> | undefined,
                  badge: notification.request.content.badge ?? undefined,
                  sound:
                    typeof notification.request.content.sound === 'string'
                      ? notification.request.content.sound
                      : undefined,
                },
                foreground: true,
              }
              listener(event)
            },
          )
          if (subscription) subscriptions.push(subscription)
        })
        .catch((err: unknown) => {
          logger.warn('Failed to attach notification listener', err)
        })

      return () => {
        subscription?.remove()
      }
    },

    onNotificationAction(listener: NotificationActionListener): () => void {
      let subscription: { remove(): void } | undefined

      void getExpoNotifications()
        .then((notifications) => {
          subscription = notifications.addNotificationResponseReceivedListener(
            (response: ExpoNotificationResponse) => {
              const event: NotificationActionEvent = {
                notification: {
                  id: response.notification.request.identifier,
                  title: response.notification.request.content.title ?? '',
                  body: response.notification.request.content.body ?? undefined,
                  data: response.notification.request.content.data as
                    | Record<string, unknown>
                    | undefined,
                },
                actionId: response.actionIdentifier,
              }
              listener(event)
            },
          )
          if (subscription) subscriptions.push(subscription)
        })
        .catch((err: unknown) => {
          logger.warn('Failed to attach notification listener', err)
        })

      return () => {
        subscription?.remove()
      }
    },

    onTokenChange(listener: TokenChangeListener): () => void {
      let subscription: { remove(): void } | undefined

      void getExpoNotifications()
        .then((notifications) => {
          subscription = notifications.addPushTokenListener((tokenData: ExpoDevicePushToken) => {
            const token: PushToken = {
              value: tokenData.data as string,
              platform: runtimePlatform,
              timestamp: Date.now(),
            }
            currentToken = token
            listener(token)
          })
          if (subscription) subscriptions.push(subscription)
        })
        .catch((err: unknown) => {
          logger.warn('Failed to attach notification listener', err)
        })

      return () => {
        subscription?.remove()
      }
    },

    async scheduleLocal(options: LocalNotificationOptions): Promise<string> {
      const Notifications = await getExpoNotifications()

      const trigger = options.at ? { date: options.at } : null

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: options.title,
          body: options.body,
          data: options.extra,
          sound: options.sound ? true : undefined,
          badge: options.badge,
        },
        trigger,
      })

      return id
    },

    async cancelLocal(id: string): Promise<void> {
      const Notifications = await getExpoNotifications()
      await Notifications.cancelScheduledNotificationAsync(id)
    },

    async cancelAllLocal(): Promise<void> {
      const Notifications = await getExpoNotifications()
      await Notifications.cancelAllScheduledNotificationsAsync()
    },

    async getPendingLocal(): Promise<LocalNotificationOptions[]> {
      const Notifications = await getExpoNotifications()
      const pending = await Notifications.getAllScheduledNotificationsAsync()
      return pending.map((n: ExpoScheduledNotification) => ({
        id: n.identifier,
        title: n.content.title ?? '',
        body: n.content.body ?? undefined,
        extra: n.content.data as Record<string, unknown> | undefined,
      }))
    },

    async getDelivered(): Promise<PushNotification[]> {
      const Notifications = await getExpoNotifications()
      const delivered = await Notifications.getPresentedNotificationsAsync()
      return delivered.map((n: ExpoNotification) => ({
        id: n.request.identifier,
        title: n.request.content.title ?? '',
        body: n.request.content.body ?? undefined,
        data: n.request.content.data as Record<string, unknown> | undefined,
      }))
    },

    async removeDelivered(ids: string[]): Promise<void> {
      const Notifications = await getExpoNotifications()
      await Promise.all(ids.map((id) => Notifications.dismissNotificationAsync(id)))
    },

    async removeAllDelivered(): Promise<void> {
      const Notifications = await getExpoNotifications()
      await Notifications.dismissAllNotificationsAsync()
    },

    async setBadge(count: number): Promise<void> {
      const Notifications = await getExpoNotifications()
      await Notifications.setBadgeCountAsync(count)
    },

    async getBadge(): Promise<number> {
      const Notifications = await getExpoNotifications()
      return await Notifications.getBadgeCountAsync()
    },

    async clearBadge(): Promise<void> {
      const Notifications = await getExpoNotifications()
      await Notifications.setBadgeCountAsync(0)
    },

    destroy(): void {
      for (const sub of subscriptions) {
        sub.remove()
      }
      subscriptions.length = 0
    },
  }

  return provider
}

/** Default React Native push notifications provider. */
export const provider: PushProvider = createReactNativePushProvider()
