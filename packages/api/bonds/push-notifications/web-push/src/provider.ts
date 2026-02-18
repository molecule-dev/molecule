/**
 * Web Push provider implementation for molecule.dev push notifications.
 *
 * Provides push notification delivery using the Web Push protocol via the
 * web-push library. Supports VAPID authentication and batch sending.
 *
 * @see https://www.npmjs.com/package/web-push
 *
 * @module
 */

import webPush from 'web-push'

import { getLogger } from '@molecule/api-bond'
import type {
  NotificationPayload,
  PushNotificationProvider,
  PushSubscription,
  SendManyResult,
  SendResult,
  VapidConfig,
} from '@molecule/api-push-notifications'

/**
 * Web Push implementation of `PushNotificationProvider`. Uses the `web-push` library
 * for VAPID-authenticated push notification delivery over the Web Push protocol.
 */
const logger = getLogger()

/**
 * Web Push implementation of `PushNotificationProvider` using the `web-push` library.
 */
class WebPushProvider implements PushNotificationProvider {
  private configured = false

  /**
   * Configures VAPID credentials for Web Push. Falls back to `VAPID_EMAIL`, `VAPID_PUBLIC_KEY`,
   * and `VAPID_PRIVATE_KEY` environment variables if no config is provided.
   * @param config - Optional VAPID configuration with email, public key, and private key.
   */
  configure(config?: VapidConfig): void {
    const email = config?.email ?? process.env.VAPID_EMAIL
    const publicKey = config?.publicKey ?? process.env.VAPID_PUBLIC_KEY
    const privateKey = config?.privateKey ?? process.env.VAPID_PRIVATE_KEY

    if (email && publicKey && privateKey) {
      webPush.setVapidDetails(`mailto:${email}`, publicKey, privateKey)
      this.configured = true
    }
  }

  /**
   * Sends a push notification to a single subscription endpoint.
   * Auto-configures VAPID on first call if not already configured.
   * @param subscription - The browser push subscription (endpoint + keys).
   * @param payload - The notification payload (title, body, icon, etc.) serialized as JSON.
   * @returns The HTTP status code, headers, and body from the push service response.
   */
  async send(subscription: PushSubscription, payload: NotificationPayload): Promise<SendResult> {
    if (!this.configured) this.configure()

    try {
      const result = await webPush.sendNotification(
        subscription as webPush.PushSubscription,
        JSON.stringify(payload),
      )
      return { statusCode: result.statusCode, headers: result.headers, body: result.body }
    } catch (error) {
      logger.error('WebPush send error:', error)
      throw error
    }
  }

  /**
   * Sends a push notification to multiple subscriptions in parallel using `Promise.allSettled`.
   * @param subscriptions - An array of browser push subscriptions.
   * @param payload - The notification payload to send to all subscriptions.
   * @returns An array of results, each containing the subscription, send result (if successful), and error (if failed).
   */
  async sendMany(
    subscriptions: PushSubscription[],
    payload: NotificationPayload,
  ): Promise<SendManyResult[]> {
    const results = await Promise.allSettled(subscriptions.map((sub) => this.send(sub, payload)))

    return results.map((result, i) => ({
      subscription: subscriptions[i],
      result: result.status === 'fulfilled' ? result.value : undefined,
      error: result.status === 'rejected' ? result.reason : undefined,
    }))
  }

  /**
   * Generates a new VAPID key pair for Web Push authentication.
   * @returns An object with `publicKey` and `privateKey` as URL-safe base64 strings.
   */
  generateVapidKeys(): { publicKey: string; privateKey: string } {
    return webPush.generateVAPIDKeys()
  }

  /**
   * Returns the VAPID public key from the `VAPID_PUBLIC_KEY` environment variable.
   * Clients need this key to create push subscriptions.
   * @returns The VAPID public key string, or `undefined` if not set.
   */
  getPublicKey(): string | undefined {
    return process.env.VAPID_PUBLIC_KEY
  }
}

/**
 * Creates a new `WebPushProvider` instance. VAPID credentials are configured lazily on first send.
 * @returns A `PushNotificationProvider` backed by the `web-push` library.
 */
export function createProvider(): PushNotificationProvider {
  return new WebPushProvider()
}

let _instance: PushNotificationProvider | undefined

/**
 * Lazily-initialized push notification provider using the `web-push` library.
 * Created on first property access via a `Proxy` so no work is done at import time.
 */
export const provider: PushNotificationProvider = new Proxy({} as PushNotificationProvider, {
  get(_, prop, receiver) {
    if (!_instance) _instance = createProvider()
    return Reflect.get(_instance, prop, receiver)
  },
})
