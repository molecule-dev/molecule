/**
 * HTTP implementation of the molecule WebhookProvider interface.
 *
 * Delivers webhook payloads via direct HTTP POST requests with
 * HMAC signature verification and automatic retries.
 *
 * @module
 */

import { createHmac, randomUUID } from 'node:crypto'

import type {
  PaginationOptions,
  WebhookDelivery,
  WebhookDeliveryResult,
  WebhookOptions,
  WebhookProvider,
  WebhookRegistration,
} from '@molecule/api-webhook'

import type { HttpWebhookConfig } from './types.js'

/**
 * Signs a payload string with the given secret using HMAC-SHA256.
 *
 * @param payload - The JSON-serialised payload body.
 * @param secret - The shared secret for this webhook.
 * @returns The hex-encoded HMAC signature.
 */
function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Pauses execution for the given duration.
 *
 * @param ms - Milliseconds to wait.
 * @returns A promise that resolves after `ms` milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/**
 * Creates an HTTP-backed {@link WebhookProvider}.
 *
 * Webhook registrations and delivery logs are stored in memory.
 * For persistent storage, use `@molecule/api-webhook-queue` instead.
 *
 * @param config - HTTP webhook provider configuration.
 * @returns A fully initialised `WebhookProvider` backed by direct HTTP delivery.
 */
export function createProvider(config: HttpWebhookConfig = {}): WebhookProvider {
  const {
    timeout = 30_000,
    retryCount: defaultRetryCount = 3,
    retryDelay: defaultRetryDelay = 1000,
    signatureHeader = 'x-webhook-signature',
  } = config

  const registrations = new Map<
    string,
    WebhookRegistration & { retryCount: number; headers: Record<string, string> }
  >()
  const deliveries = new Map<string, WebhookDelivery>()

  /**
   * Delivers a payload to a single webhook endpoint.
   *
   * @param registration - The webhook to deliver to.
   * @param event - The event type.
   * @param payload - The event payload.
   * @returns The delivery result.
   */
  async function deliver(
    registration: WebhookRegistration & { retryCount: number; headers: Record<string, string> },
    event: string,
    payload: unknown,
  ): Promise<WebhookDeliveryResult> {
    const deliveryId = randomUUID()
    const body = JSON.stringify(payload)
    const signature = signPayload(body, registration.secret)

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-webhook-event': event,
      [signatureHeader]: signature,
      ...registration.headers,
    }

    const start = Date.now()
    let status: number
    let success: boolean

    try {
      const response = await fetch(registration.url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(timeout),
      })
      status = response.status
      success = response.ok
    } catch {
      status = 0
      success = false
    }

    const duration = Date.now() - start

    deliveries.set(deliveryId, {
      id: deliveryId,
      webhookId: registration.id,
      event,
      payload,
      status,
      success,
      duration,
      createdAt: new Date(),
    })

    return {
      webhookId: registration.id,
      deliveryId,
      status,
      success,
      duration,
    }
  }

  /**
   * Delivers with automatic retries on failure.
   *
   * @param registration - The webhook to deliver to.
   * @param event - The event type.
   * @param payload - The event payload.
   * @returns The final delivery result after all attempts.
   */
  async function deliverWithRetries(
    registration: WebhookRegistration & { retryCount: number; headers: Record<string, string> },
    event: string,
    payload: unknown,
  ): Promise<WebhookDeliveryResult> {
    let result = await deliver(registration, event, payload)

    for (let attempt = 0; attempt < registration.retryCount && !result.success; attempt += 1) {
      await delay(defaultRetryDelay)
      result = await deliver(registration, event, payload)
    }

    return result
  }

  const provider: WebhookProvider = {
    async register(
      url: string,
      events: string[],
      options?: WebhookOptions,
    ): Promise<WebhookRegistration> {
      const id = randomUUID()
      const secret = options?.secret ?? randomUUID()
      const registration = {
        id,
        url,
        events: [...events],
        secret,
        active: true,
        createdAt: new Date(),
        retryCount: options?.retryCount ?? defaultRetryCount,
        headers: options?.headers ?? {},
      }
      registrations.set(id, registration)

      return {
        id: registration.id,
        url: registration.url,
        events: registration.events,
        secret: registration.secret,
        active: registration.active,
        createdAt: registration.createdAt,
      }
    },

    async unregister(webhookId: string): Promise<void> {
      if (!registrations.has(webhookId)) {
        throw new Error(`Webhook "${webhookId}" does not exist.`)
      }
      registrations.delete(webhookId)
    },

    async dispatch(event: string, payload: unknown): Promise<WebhookDeliveryResult[]> {
      const matching = [...registrations.values()].filter(
        (r) => r.active && r.events.includes(event),
      )

      const results = await Promise.all(matching.map((r) => deliverWithRetries(r, event, payload)))

      return results
    },

    async list(): Promise<WebhookRegistration[]> {
      return [...registrations.values()].map((r) => ({
        id: r.id,
        url: r.url,
        events: r.events,
        secret: r.secret,
        active: r.active,
        createdAt: r.createdAt,
      }))
    },

    async getDeliveryLog(
      webhookId: string,
      options?: PaginationOptions,
    ): Promise<WebhookDelivery[]> {
      const all = [...deliveries.values()]
        .filter((d) => d.webhookId === webhookId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      const offset = options?.offset ?? 0
      const limit = options?.limit ?? 50

      return all.slice(offset, offset + limit)
    },

    async retry(deliveryId: string): Promise<WebhookDeliveryResult> {
      const original = deliveries.get(deliveryId)
      if (!original) {
        throw new Error(`Delivery "${deliveryId}" does not exist.`)
      }

      const registration = registrations.get(original.webhookId)
      if (!registration) {
        throw new Error(`Webhook "${original.webhookId}" no longer exists.`)
      }

      return deliver(registration, original.event, original.payload)
    },
  }

  return provider
}
