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

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'
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
  private publicKey: string | undefined

  /**
   * Configures VAPID credentials for Web Push. Falls back to `VAPID_EMAIL`, `VAPID_PUBLIC_KEY`,
   * and `VAPID_PRIVATE_KEY` environment variables if no config is provided.
   *
   * Accepts the contact address with or without a `mailto:` prefix — the secrets
   * registry teaches the `mailto:you@example.com` form, so blindly prepending
   * would silently ship a malformed `mailto:mailto:…` VAPID subject that some
   * push services reject.
   *
   * @param config - Optional VAPID configuration with email, public key, and private key.
   */
  configure(config?: VapidConfig): void {
    const email = config?.email ?? process.env.VAPID_EMAIL
    const publicKey = config?.publicKey ?? process.env.VAPID_PUBLIC_KEY
    const privateKey = config?.privateKey ?? process.env.VAPID_PRIVATE_KEY

    if (email && publicKey && privateKey) {
      const subject =
        email.startsWith('mailto:') || email.startsWith('https:') ? email : `mailto:${email}`
      webPush.setVapidDetails(subject, publicKey, privateKey)
      this.configured = true
      this.publicKey = publicKey
    } else {
      const missing = [
        !email && 'VAPID_EMAIL',
        !publicKey && 'VAPID_PUBLIC_KEY',
        !privateKey && 'VAPID_PRIVATE_KEY',
      ]
        .filter(Boolean)
        .join(', ')
      logger.warn(`Push notifications disabled: missing ${missing}`)
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
    if (!this.configured) {
      throw new Error(
        'Push notifications not configured. Set VAPID_EMAIL, VAPID_PUBLIC_KEY, and VAPID_PRIVATE_KEY.',
      )
    }

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
   * Returns the VAPID public key clients need to create push subscriptions.
   * Prefers the key passed to `configure()` (env-only lookup here broke every
   * app that configured with an explicit `VapidConfig` — the subscribe route
   * served `undefined` while sends worked), falling back to the
   * `VAPID_PUBLIC_KEY` environment variable.
   * @returns The VAPID public key string, or `undefined` if not configured.
   */
  getPublicKey(): string | undefined {
    return this.publicKey ?? process.env.VAPID_PUBLIC_KEY
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
 *
 * The `set` trap is REQUIRED, not defensive: methods reached through the proxy
 * run with `this` bound to the proxy, so an instance-state write like
 * `this.configured = true` would otherwise land on the dummy `{}` target while
 * every read passes through to the real instance — `configure()` could then
 * never take effect and every send would throw "not configured".
 */
export const provider: PushNotificationProvider = new Proxy({} as PushNotificationProvider, {
  get(_, prop, receiver) {
    if (!_instance) _instance = createProvider()
    return Reflect.get(_instance, prop, receiver)
  },
  set(_, prop, value) {
    if (!_instance) _instance = createProvider()
    return Reflect.set(_instance, prop, value)
  },
})
