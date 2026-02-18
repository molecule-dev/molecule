/**
 * Push notification bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-push-notifications-web-push`) call
 * `setProvider()` during setup. Application code uses the convenience
 * delegates (`send`, `sendMany`, `configure`, etc.) directly.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/api-bond'

import type {
  NotificationPayload,
  PushNotificationProvider,
  PushSubscription,
  SendManyResult,
  SendResult,
  VapidConfig,
  VapidKeys,
} from './types.js'

const BOND_TYPE = 'push-notifications'

/**
 * Registers a push notification provider as the active singleton.
 * Called by bond packages during application startup.
 *
 * @param provider - The push notification provider implementation to bond.
 */
export const setProvider = (provider: PushNotificationProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded push notification provider, or `undefined` if none is bonded.
 *
 * @returns The bonded push notification provider, or `undefined`.
 */
export const getProvider = (): PushNotificationProvider | undefined => {
  return bondGet<PushNotificationProvider>(BOND_TYPE)
}

/**
 * Checks whether a push notification provider is currently bonded.
 *
 * @returns `true` if a push notification provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded push notification provider, throwing if none is configured.
 *
 * @returns The bonded push notification provider.
 * @throws {Error} If no push notification provider has been bonded.
 */
export const requireProvider = (): PushNotificationProvider => {
  const provider = getProvider()
  if (!provider) {
    throw new Error(
      `No push notification provider bonded. ` +
        `Call setProvider() with a PushNotificationProvider implementation ` +
        `(e.g. @molecule/api-push-notifications-web-push).`,
    )
  }
  return provider
}

// ── Convenience delegates ──────────────────────────────────────────────

/**
 * Configures VAPID credentials on the bonded push notification provider.
 *
 * @param config - The VAPID configuration containing email, public key, and private key.
 */
export const configure = (config?: VapidConfig): void => {
  requireProvider().configure(config)
}

/**
 * Sends a push notification to a single subscription endpoint.
 *
 * @param subscription - The push subscription containing the client endpoint and encryption keys.
 * @param payload - The notification payload with title and optional display options.
 * @returns The send result containing status code, headers, and response body.
 */
export const send = (
  subscription: PushSubscription,
  payload: NotificationPayload,
): Promise<SendResult> => {
  return requireProvider().send(subscription, payload)
}

/**
 * Sends a push notification to multiple subscription endpoints. Handles
 * partial failures gracefully — each result includes either the send
 * result or the error for that subscription.
 *
 * @param subscriptions - The push subscriptions to send to.
 * @param payload - The notification payload with title and optional display options.
 * @returns One result entry per subscription, each containing either `result` or `error`.
 */
export const sendMany = (
  subscriptions: PushSubscription[],
  payload: NotificationPayload,
): Promise<SendManyResult[]> => {
  return requireProvider().sendMany(subscriptions, payload)
}

/**
 * Generates a new VAPID key pair for push notification authentication.
 *
 * @returns An object containing `publicKey` and `privateKey` strings.
 */
export const generateVapidKeys = (): VapidKeys => {
  return requireProvider().generateVapidKeys()
}

/**
 * Returns the public VAPID key for client-side push subscription requests.
 *
 * @returns The public VAPID key string, or `undefined` if not configured.
 */
export const getPublicKey = (): string | undefined => {
  return requireProvider().getPublicKey()
}
