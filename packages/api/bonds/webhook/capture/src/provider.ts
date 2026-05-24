/**
 * Webhook capture provider for molecule.dev.
 *
 * Implements {@link WebhookProvider} by recording every `dispatch()` call as an
 * {@link ActivityEvent} instead of (or in addition to) actually delivering it.
 * Intercept-only by default (synthetic `WebhookDeliveryResult[]`); delegates
 * AND tees when wrapping a real provider.
 *
 * @module
 */

import { record } from '@molecule/api-activity'
import type {
  PaginationOptions,
  WebhookDelivery,
  WebhookDeliveryResult,
  WebhookOptions,
  WebhookProvider,
  WebhookRegistration,
} from '@molecule/api-webhook'

/**
 * Creates a webhook capture provider.
 *
 * When `realProvider` is provided, each event is dispatched through it and the
 * captured event records the real outcome (delegate + tee). When omitted (the
 * dev default), dispatches are intercepted and a synthetic single-element
 * `WebhookDeliveryResult[]` is returned. Registration / log / retry methods
 * delegate to the real provider when present and otherwise return empty
 * intercept-only results.
 *
 * @param realProvider - Optional real provider to delegate to and tee.
 * @returns A {@link WebhookProvider} that records activity for every dispatch.
 */
export function createWebhookCaptureProvider(realProvider?: WebhookProvider): WebhookProvider {
  return {
    async register(
      url: string,
      events: string[],
      options?: WebhookOptions,
    ): Promise<WebhookRegistration> {
      if (realProvider) {
        return realProvider.register(url, events, options)
      }
      return {
        id: `captured-${crypto.randomUUID()}`,
        url,
        events,
        secret: options?.secret ?? '',
        active: true,
        createdAt: new Date(),
      }
    },

    async unregister(webhookId: string): Promise<void> {
      await realProvider?.unregister(webhookId)
    },

    async dispatch(event: string, payload: unknown): Promise<WebhookDeliveryResult[]> {
      const id = crypto.randomUUID()

      if (realProvider) {
        try {
          const results = await realProvider.dispatch(event, payload)
          await record({
            id,
            type: 'webhook',
            status: 'sent',
            recipient: event,
            summary: `Webhook dispatch: ${event}`,
            payload: { event, payload },
            result: results,
            timestamp: new Date().toISOString(),
          })
          return results
        } catch (error) {
          await record({
            id,
            type: 'webhook',
            status: 'failed',
            recipient: event,
            summary: `Webhook dispatch: ${event}`,
            payload: { event, payload },
            result: { error: error instanceof Error ? error.message : String(error) },
            timestamp: new Date().toISOString(),
          })
          throw error
        }
      }

      const results: WebhookDeliveryResult[] = [
        {
          webhookId: `captured-${id}`,
          deliveryId: `captured-${crypto.randomUUID()}`,
          status: 200,
          success: true,
          duration: 0,
        },
      ]

      await record({
        id,
        type: 'webhook',
        status: 'captured',
        recipient: event,
        summary: `Webhook dispatch: ${event}`,
        payload: { event, payload },
        result: results,
        timestamp: new Date().toISOString(),
      })

      return results
    },

    async list(): Promise<WebhookRegistration[]> {
      if (realProvider) {
        return realProvider.list()
      }
      return []
    },

    async getDeliveryLog(
      webhookId: string,
      options?: PaginationOptions,
    ): Promise<WebhookDelivery[]> {
      if (realProvider) {
        return realProvider.getDeliveryLog(webhookId, options)
      }
      return []
    },

    async retry(deliveryId: string): Promise<WebhookDeliveryResult> {
      if (realProvider) {
        return realProvider.retry(deliveryId)
      }
      return {
        webhookId: `captured-${crypto.randomUUID()}`,
        deliveryId,
        status: 200,
        success: true,
        duration: 0,
      }
    },
  }
}

/** Default webhook capture provider (intercept-only). */
export const provider: WebhookProvider = createWebhookCaptureProvider()
