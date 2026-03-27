/**
 * Queue-backed implementation of the molecule WebhookProvider interface.
 *
 * Delivers webhook payloads through an internal job queue with exponential
 * backoff retries and configurable concurrency. Unlike the HTTP provider,
 * `dispatch()` enqueues jobs and returns immediately with "accepted" results
 * while deliveries are processed asynchronously.
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

import type { JobStatus, QueueWebhookConfig } from './types.js'

/**
 * Internal job representation for queued deliveries.
 */
interface DeliveryJob {
  /** Unique job identifier. */
  id: string

  /** Target webhook registration. */
  webhookId: string

  /** Event type. */
  event: string

  /** Serialised payload. */
  payload: unknown

  /** Current attempt number (0-based). */
  attempt: number

  /** Current job status. */
  status: JobStatus

  /** When the job was created. */
  createdAt: Date
}

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
 * Calculates exponential backoff delay with jitter.
 *
 * @param attempt - The current attempt number (0-based).
 * @param baseDelay - The base delay in milliseconds.
 * @param maxDelay - The maximum delay cap.
 * @returns The backoff delay in milliseconds.
 */
function calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponential = baseDelay * Math.pow(2, attempt)
  return Math.min(exponential, maxDelay)
}

/**
 * Creates a queue-backed {@link WebhookProvider}.
 *
 * @param config - Queue webhook provider configuration.
 * @returns A fully initialised `WebhookProvider` with queue-based delivery.
 */
export function createProvider(config: QueueWebhookConfig = {}): WebhookProvider {
  const {
    timeout = 30_000,
    maxRetries = 5,
    baseDelay = 1000,
    maxDelay = 60_000,
    concurrency = 10,
    signatureHeader = 'x-webhook-signature',
  } = config

  const registrations = new Map<
    string,
    WebhookRegistration & { retryCount: number; headers: Record<string, string> }
  >()
  const deliveries = new Map<string, WebhookDelivery>()
  const queue: DeliveryJob[] = []

  let activeWorkers = 0
  let processing = false

  /**
   * Delivers a single job to its webhook endpoint.
   *
   * @param job - The delivery job to process.
   * @returns The delivery result.
   */
  async function deliverJob(job: DeliveryJob): Promise<WebhookDelivery> {
    const registration = registrations.get(job.webhookId)
    if (!registration) {
      return {
        id: job.id,
        webhookId: job.webhookId,
        event: job.event,
        payload: job.payload,
        status: 0,
        success: false,
        duration: 0,
        createdAt: job.createdAt,
      }
    }

    const body = JSON.stringify(job.payload)
    const signature = signPayload(body, registration.secret)

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-webhook-event': job.event,
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

    return {
      id: job.id,
      webhookId: job.webhookId,
      event: job.event,
      payload: job.payload,
      status,
      success,
      duration,
      createdAt: job.createdAt,
    }
  }

  /**
   * Processes a single job with retries.
   *
   * @param job - The job to process.
   */
  async function processJob(job: DeliveryJob): Promise<void> {
    job.status = 'processing'

    let delivery = await deliverJob(job)

    while (!delivery.success && job.attempt < maxRetries) {
      const backoff = calculateBackoff(job.attempt, baseDelay, maxDelay)
      await delay(backoff)
      job.attempt += 1
      delivery = await deliverJob(job)
    }

    job.status = delivery.success ? 'completed' : 'failed'
    deliveries.set(job.id, delivery)
  }

  /**
   * Starts the queue processor if not already running.
   */
  function startProcessing(): void {
    if (processing) return
    processing = true

    void (async () => {
      while (queue.length > 0 || activeWorkers > 0) {
        if (queue.length === 0 || activeWorkers >= concurrency) {
          await delay(10)
          continue
        }

        const job = queue.shift()
        if (!job) continue

        activeWorkers += 1
        void processJob(job).finally(() => {
          activeWorkers -= 1
        })
      }

      processing = false
    })()
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
        retryCount: options?.retryCount ?? maxRetries,
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

      const results: WebhookDeliveryResult[] = []

      for (const registration of matching) {
        const jobId = randomUUID()
        const job: DeliveryJob = {
          id: jobId,
          webhookId: registration.id,
          event,
          payload,
          attempt: 0,
          status: 'pending',
          createdAt: new Date(),
        }
        queue.push(job)

        results.push({
          webhookId: registration.id,
          deliveryId: jobId,
          status: 202,
          success: true,
          duration: 0,
        })
      }

      startProcessing()

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

      const jobId = randomUUID()
      const job: DeliveryJob = {
        id: jobId,
        webhookId: original.webhookId,
        event: original.event,
        payload: original.payload,
        attempt: 0,
        status: 'pending',
        createdAt: new Date(),
      }
      queue.push(job)

      startProcessing()

      return {
        webhookId: original.webhookId,
        deliveryId: jobId,
        status: 202,
        success: true,
        duration: 0,
      }
    },
  }

  return provider
}
