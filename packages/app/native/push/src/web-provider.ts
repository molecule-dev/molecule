/**
 * Web-based push provider using the Push API.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'

import type {
  LocalNotificationOptions,
  NotificationActionListener,
  NotificationReceivedListener,
  PermissionStatus,
  PushNotification,
  PushProvider,
  PushToken,
  TokenChangeListener,
} from './types.js'

// Badge API types
interface NavigatorWithBadge extends Navigator {
  setAppBadge(count: number): Promise<void>
  clearAppBadge(): Promise<void>
}

// Extended Notification interface for additional properties
interface ExtendedNotification extends Notification {
  image?: string
  timestamp?: number
}

// Extended NotificationOptions for service worker
interface ExtendedNotificationOptions extends NotificationOptions {
  actions?: Array<{ action: string; title: string; icon?: string }>
}

/**
 * Creates a web push provider using the browser Push API and Notification API.
 * @param vapidPublicKey - Optional VAPID public key for server-authenticated subscriptions.
 * @returns A {@link PushProvider} backed by the Web Push API.
 */
export const createWebPushProvider = (vapidPublicKey?: string): PushProvider => {
  const notificationReceivedListeners = new Set<NotificationReceivedListener>()
  const notificationActionListeners = new Set<NotificationActionListener>()
  const tokenChangeListeners = new Set<TokenChangeListener>()

  let currentToken: PushToken | null = null
  let registration: ServiceWorkerRegistration | null = null

  // Convert VAPID key to Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
  }

  return {
    async checkPermission(): Promise<PermissionStatus> {
      if (!('Notification' in window)) {
        return 'denied'
      }
      return Notification.permission as PermissionStatus
    },

    async requestPermission(): Promise<PermissionStatus> {
      if (!('Notification' in window)) {
        return 'denied'
      }

      const result = await Notification.requestPermission()
      return result as PermissionStatus
    },

    async register(): Promise<PushToken> {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error(
          t('push.error.notSupported', undefined, {
            defaultValue: 'Push notifications not supported',
          }),
        )
      }

      // Get service worker registration
      registration = await navigator.serviceWorker.ready

      // Subscribe to push
      const subscribeOptions: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
      }

      if (vapidPublicKey) {
        subscribeOptions.applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
          .buffer as ArrayBuffer
      }

      const subscription = await registration.pushManager.subscribe(subscribeOptions)
      const token: PushToken = {
        value: JSON.stringify(subscription.toJSON()),
        platform: 'web',
        timestamp: Date.now(),
      }

      currentToken = token
      tokenChangeListeners.forEach((listener) => listener(token))

      return token
    },

    async unregister(): Promise<void> {
      if (!registration) {
        registration = await navigator.serviceWorker.ready
      }

      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
      }

      currentToken = null
    },

    async getToken(): Promise<PushToken | null> {
      if (currentToken) return currentToken

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return null
      }

      registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        currentToken = {
          value: JSON.stringify(subscription.toJSON()),
          platform: 'web',
          timestamp: Date.now(),
        }
        return currentToken
      }

      return null
    },

    onNotificationReceived(listener: NotificationReceivedListener): () => void {
      notificationReceivedListeners.add(listener)
      return () => notificationReceivedListeners.delete(listener)
    },

    onNotificationAction(listener: NotificationActionListener): () => void {
      notificationActionListeners.add(listener)
      return () => notificationActionListeners.delete(listener)
    },

    onTokenChange(listener: TokenChangeListener): () => void {
      tokenChangeListeners.add(listener)
      return () => tokenChangeListeners.delete(listener)
    },

    async scheduleLocal(options: LocalNotificationOptions): Promise<string> {
      const permission = await this.checkPermission()
      if (permission !== 'granted') {
        throw new Error(
          t('push.error.permissionNotGranted', undefined, {
            defaultValue: 'Notification permission not granted',
          }),
        )
      }

      const id = options.id || Math.random().toString(36).slice(2)

      const showNotification = (): void => {
        if (registration) {
          const notificationOptions: ExtendedNotificationOptions = {
            body: options.body,
            data: { id, ...options.extra },
            badge: options.badge ? String(options.badge) : undefined,
            tag: id,
          }
          if (options.actions) {
            notificationOptions.actions = options.actions.map((a) => ({
              action: a.id,
              title: a.title,
              icon: a.icon,
            }))
          }
          registration.showNotification(options.title, notificationOptions as NotificationOptions)
        } else {
          new Notification(options.title, {
            body: options.body,
            data: { id, ...options.extra },
            tag: id,
          })
        }
      }

      if (options.at) {
        const delay = options.at.getTime() - Date.now()
        if (delay > 0) {
          setTimeout(showNotification, delay)
        } else {
          showNotification()
        }
      } else {
        showNotification()
      }

      return id
    },

    async cancelLocal(_id: string): Promise<void> {
      // Web API doesn't support canceling scheduled notifications easily
      // This would require tracking timers
    },

    async cancelAllLocal(): Promise<void> {
      // Same limitation
    },

    async getPendingLocal(): Promise<LocalNotificationOptions[]> {
      // Web API doesn't expose pending notifications
      return []
    },

    async getDelivered(): Promise<PushNotification[]> {
      if (!registration) {
        registration = await navigator.serviceWorker.ready
      }

      const notifications = await registration.getNotifications()
      return notifications.map((n) => {
        const extN = n as ExtendedNotification
        return {
          id: n.tag || Math.random().toString(36).slice(2),
          title: n.title,
          body: n.body || undefined,
          data: n.data as Record<string, unknown> | undefined,
          icon: n.icon || undefined,
          image: extN.image || undefined,
          tag: n.tag || undefined,
          timestamp: extN.timestamp,
        }
      })
    },

    async removeDelivered(ids: string[]): Promise<void> {
      if (!registration) {
        registration = await navigator.serviceWorker.ready
      }

      const notifications = await registration.getNotifications()
      for (const n of notifications) {
        if (ids.includes(n.tag || '')) {
          n.close()
        }
      }
    },

    async removeAllDelivered(): Promise<void> {
      if (!registration) {
        registration = await navigator.serviceWorker.ready
      }

      const notifications = await registration.getNotifications()
      for (const n of notifications) {
        n.close()
      }
    },

    async setBadge(count: number): Promise<void> {
      if ('setAppBadge' in navigator) {
        await (navigator as NavigatorWithBadge).setAppBadge(count)
      }
    },

    async getBadge(): Promise<number> {
      // Web API doesn't support reading badge
      return 0
    },

    async clearBadge(): Promise<void> {
      if ('clearAppBadge' in navigator) {
        await (navigator as NavigatorWithBadge).clearAppBadge()
      }
    },

    destroy(): void {
      notificationReceivedListeners.clear()
      notificationActionListeners.clear()
      tokenChangeListeners.clear()
    },
  }
}
