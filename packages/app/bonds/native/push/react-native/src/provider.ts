/**
 * React Native push notifications provider using expo-notifications.
 *
 * Implements the PushProvider interface from `@molecule/app-push`.
 *
 * @module
 */

import type {
  DevicePushToken as ExpoDevicePushToken,
  Notification as ExpoNotification,
  NotificationResponse as ExpoNotificationResponse,
  ScheduledNotification as ExpoScheduledNotification,
} from 'expo-notifications'

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

/**
 * Dynamically loads expo-notifications.
 * @returns The expo-notifications module.
 */
async function getExpoNotifications(): Promise<typeof import('expo-notifications')> {
  try {
    return await import('expo-notifications')
  } catch (error) {
    throw new Error(
      t(
        'push.error.missingDependency',
        { library: 'expo-notifications' },
        {
          defaultValue:
            'expo-notifications is required but not installed. Install it with: npx expo install expo-notifications',
        },
      ),
      { cause: error },
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
  // Canonical EXPO push token (`ExponentPushToken[...]`) — what the server sends
  // through Expo's Push API. Distinct from `currentDeviceToken`.
  let currentToken: PushToken | null = null
  // Raw NATIVE device push token (FCM/APNs) observed via `onTokenChange`. Tracked
  // separately so a device-token roll never clobbers the Expo token above.
  let currentDeviceToken: string | null = null

  /**
   * Resolves the runtime platform, falling back to 'android' when react-native
   * is not available (e.g. tests, Storybook, non-RN environments).
   */
  async function getRuntimePlatform(): Promise<'ios' | 'android' | 'web'> {
    try {
      const { Platform } = await import('react-native')
      const os = Platform.OS
      if (os === 'ios' || os === 'android' || os === 'web') return os
      return 'android'
    } catch (_error) {
      // react-native is not installed in this environment; 'android' is a safe
      // fallback that keeps the rest of the provider functional.
      return 'android'
    }
  }

  /**
   * Resolves the EAS `projectId` required by `getExpoPushTokenAsync` on Expo
   * SDK 49+ standalone/EAS builds. Prefers the explicit `projectId` config
   * option, then falls back to the value baked into the Expo config
   * (`app.json` `extra.eas.projectId`, exposed at runtime via `expo-constants`).
   * Returns `undefined` when neither is available (valid inside Expo Go).
   */
  async function resolveProjectId(): Promise<string | undefined> {
    if (config.projectId) return config.projectId
    try {
      const Constants = (await import('expo-constants')).default
      return (
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId ?? undefined
      )
    } catch (_error) {
      // expo-constants is optional. Without it (and without config.projectId)
      // registration proceeds with no projectId — fine in Expo Go, but EAS /
      // standalone builds must supply one or getExpoPushTokenAsync will throw.
      return undefined
    }
  }

  /**
   * Fetches a fresh EXPO push token (`ExponentPushToken[...]`) and caches it as
   * the canonical `currentToken`. Passes the resolved `projectId` so it works
   * outside Expo Go on SDK 49+.
   * @param notifications - The loaded expo-notifications module.
   * @param platform - The runtime platform for the returned token.
   * @returns The freshly fetched Expo push token.
   */
  async function fetchExpoToken(
    notifications: typeof import('expo-notifications'),
    platform: 'ios' | 'android' | 'web',
  ): Promise<PushToken> {
    const projectId = await resolveProjectId()
    const tokenData = await notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )
    const token: PushToken = {
      value: tokenData.data,
      platform,
      timestamp: Date.now(),
    }
    currentToken = token
    return token
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
      const [Notifications, platform] = await Promise.all([
        getExpoNotifications(),
        getRuntimePlatform(),
      ])
      const token = await fetchExpoToken(Notifications, platform)
      logger.debug('Push token registered', token.value)
      return token
    },

    async unregister(): Promise<void> {
      const Notifications = await getExpoNotifications()
      // Actually deregister the device with the OS push service (APNs/FCM), not
      // just drop the local cache — otherwise the backend keeps delivering to a
      // token the user meant to disable. Guard for older expo-notifications
      // versions that predate this API.
      if (typeof Notifications.unregisterForNotificationsAsync === 'function') {
        await Notifications.unregisterForNotificationsAsync()
      }
      currentToken = null
      currentDeviceToken = null
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

      void Promise.all([getExpoNotifications(), getRuntimePlatform()])
        .then(([notifications, platform]) => {
          subscription = notifications.addPushTokenListener((deviceToken: ExpoDevicePushToken) => {
            // `addPushTokenListener` fires with the NATIVE device push token
            // (FCM/APNs) — NOT the Expo push token. Record it distinctly (never
            // overwrite the cached Expo token), then re-fetch a fresh Expo push
            // token and hand THAT to the listener, so `onTokenChange` stays
            // consistent with `register()`/`getToken()` — all Expo tokens the
            // Expo Push API can deliver to, never a raw native token.
            currentDeviceToken =
              typeof deviceToken.data === 'string'
                ? deviceToken.data
                : JSON.stringify(deviceToken.data)
            logger.debug('Native device push token changed', currentDeviceToken)

            void fetchExpoToken(notifications, platform)
              .then((token) => {
                listener(token)
              })
              .catch((err: unknown) => {
                logger.warn('Failed to refresh Expo push token after device token change', err)
              })
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
