/**
 * Push notification capture provider for molecule.dev.
 *
 * Implements {@link PushNotificationProvider} by recording every `send()` /
 * `sendMany()` call as an {@link ActivityEvent} instead of (or in addition to)
 * actually delivering it. Intercept-only by default (synthetic 201
 * `SendResult`); delegates AND tees when wrapping a real provider.
 *
 * @module
 */

import { record } from '@molecule/api-activity'
import type {
  NotificationPayload,
  PushNotificationProvider,
  PushSubscription,
  SendManyResult,
  SendResult,
  VapidConfig,
  VapidKeys,
} from '@molecule/api-push-notifications'

/**
 * Creates a push notification capture provider.
 *
 * When `realProvider` is provided, each notification is delivered through it
 * and the captured event records the real outcome (delegate + tee). When
 * omitted (the dev default), notifications are intercepted and a synthetic
 * `SendResult` (`statusCode: 201`) is returned.
 *
 * @param realProvider - Optional real provider to delegate to and tee.
 * @returns A {@link PushNotificationProvider} that records activity for every send.
 */
export function createPushCaptureProvider(
  realProvider?: PushNotificationProvider,
): PushNotificationProvider {
  return {
    configure(config?: VapidConfig): void {
      realProvider?.configure(config)
    },

    async send(subscription: PushSubscription, payload: NotificationPayload): Promise<SendResult> {
      const id = crypto.randomUUID()

      if (realProvider) {
        try {
          const result = await realProvider.send(subscription, payload)
          await record({
            id,
            type: 'push',
            status: 'sent',
            recipient: subscription.endpoint,
            summary: payload.title,
            payload: { subscription, payload },
            result,
            timestamp: new Date().toISOString(),
          })
          return result
        } catch (error) {
          await record({
            id,
            type: 'push',
            status: 'failed',
            recipient: subscription.endpoint,
            summary: payload.title,
            payload: { subscription, payload },
            result: { error: error instanceof Error ? error.message : String(error) },
            timestamp: new Date().toISOString(),
          })
          throw error
        }
      }

      const result: SendResult = { statusCode: 201, headers: {}, body: '' }

      await record({
        id,
        type: 'push',
        status: 'captured',
        recipient: subscription.endpoint,
        summary: payload.title,
        payload: { subscription, payload },
        result,
        timestamp: new Date().toISOString(),
      })

      return result
    },

    async sendMany(
      subscriptions: PushSubscription[],
      payload: NotificationPayload,
    ): Promise<SendManyResult[]> {
      const results: SendManyResult[] = []
      for (const subscription of subscriptions) {
        try {
          const result = await this.send(subscription, payload)
          results.push({ subscription, result })
        } catch (error) {
          results.push({
            subscription,
            error: error instanceof Error ? error : new Error(String(error)),
          })
        }
      }
      return results
    },

    generateVapidKeys(): VapidKeys {
      if (realProvider) {
        return realProvider.generateVapidKeys()
      }
      return { publicKey: '', privateKey: '' }
    },

    getPublicKey(): string | undefined {
      return realProvider?.getPublicKey()
    },
  }
}

/** Default push notification capture provider (intercept-only). */
export const provider: PushNotificationProvider = createPushCaptureProvider()
