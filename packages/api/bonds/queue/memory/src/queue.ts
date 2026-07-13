/**
 * In-memory queue implementation.
 *
 * SQS-style visibility-lease semantics over an in-process message list:
 * messages are leased (invisible) on delivery and return to the queue when
 * the lease expires without an `ack()`, giving at-least-once delivery with
 * redelivery on subscriber handler failure. A single lazily-armed
 * `setTimeout` per queue drives delayed visibility and lease reclaim; it is
 * tracked, `unref()`d, and cleared on `close()` so nothing leaks.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import type {
  MessageHandler,
  Queue,
  QueueMessage,
  ReceivedMessage,
  ReceiveOptions,
} from '@molecule/api-queue'

import type { MemoryQueueConfig, MemoryQueueHandle } from './types.js'

const logger = getLogger()

/**
 * How long (ms) a FIFO `deduplicationId` suppresses duplicate sends —
 * mirrors SQS's 5-minute deduplication window.
 */
const DEDUP_WINDOW_MS = 5 * 60_000

/**
 * A message stored in the queue, with lease bookkeeping.
 */
interface StoredMessage {
  /** Message ID. */
  id: string
  /** Structured-cloned message payload. */
  body: unknown
  /** Message attributes/headers. */
  attributes?: Record<string, string | number | boolean>
  /** FIFO message group. */
  groupId?: string
  /** When the message was sent. */
  sentAt: Date
  /** Epoch ms at which the message becomes (re)deliverable. */
  visibleAt: number
  /** Epoch ms at which the current lease expires, or `null` when unleased. */
  leaseExpiresAt: number | null
  /** Number of times the message has been delivered. */
  receiveCount: number
  /** Receipt handle of the most recent delivery ('' before first delivery). */
  receiptHandle: string
}

/**
 * A push consumer registered via `subscribe()`.
 */
interface SubscriberState {
  /** The message handler. */
  handler: MessageHandler<unknown>
  /** Maximum concurrently in-flight handler invocations. */
  concurrency: number
  /** Lease duration (ms) for messages dispatched to this subscriber. */
  visibilityTimeoutMs: number
  /** Currently in-flight handler invocations. */
  active: number
}

/**
 * A pending long-poll `receive()` call awaiting messages.
 */
interface Waiter {
  /** Maximum messages to resolve with. */
  maxMessages: number
  /** Lease duration (ms) for messages resolved to this waiter. */
  visibilityTimeoutMs: number
  /** Resolves the pending `receive()` promise. */
  resolve: (messages: ReceivedMessage<unknown>[]) => void
  /** Timeout that resolves the poll with `[]` when it elapses. */
  timer: ReturnType<typeof setTimeout>
}

/**
 * Creates an in-memory `Queue` with SQS-style visibility-lease delivery:
 * send/sendBatch (with `delaySeconds` and FIFO group/dedup support), pull
 * `receive()` (with long polling via `waitTimeSeconds`), push `subscribe()`
 * (with `maxMessages`-bounded concurrency, auto-ack on handler success, and
 * redelivery on handler failure), `size()`, and `purge()`. Messages
 * exceeding the delivery cap are routed to the configured dead-letter queue
 * or dropped with an error log.
 *
 * @param queueName - The queue name.
 * @param config - Resolved queue configuration (defaults, FIFO mode, DLQ, queue resolver).
 * @returns A handle with the `Queue` and an internal `close()` for the provider.
 */
export const createQueue = (queueName: string, config: MemoryQueueConfig): MemoryQueueHandle => {
  const messages: StoredMessage[] = []
  const subscribers = new Map<string, SubscriberState>()
  const waiters = new Set<Waiter>()
  const dedupIds = new Map<string, { id: string; expiresAt: number }>()
  let wakeTimer: ReturnType<typeof setTimeout> | null = null
  let closed = false

  const maxReceiveCount = (): number =>
    config.deadLetterQueue?.maxReceiveCount ?? config.maxReceiveCount

  const isStored = (message: StoredMessage): boolean => messages.includes(message)

  const removeMessage = (message: StoredMessage): void => {
    const index = messages.indexOf(message)
    if (index !== -1) messages.splice(index, 1)
  }

  const pruneDedup = (now: number): void => {
    for (const [key, entry] of dedupIds) {
      if (entry.expiresAt <= now) dedupIds.delete(key)
    }
  }

  /**
   * Routes a delivery-cap-exceeded message to the dead-letter queue when one
   * is configured (and isn't this queue itself), otherwise drops it loudly.
   */
  const deadLetter = (message: StoredMessage): void => {
    removeMessage(message)
    const dlqName = config.deadLetterQueue?.name
    if (dlqName && dlqName !== queueName) {
      logger.warn(
        `Memory queue "${queueName}": message ${message.id} exceeded ${maxReceiveCount()} deliveries — routing to dead-letter queue "${dlqName}"`,
      )
      config
        .resolveQueue(dlqName)
        .send({
          id: message.id,
          body: message.body,
          attributes: message.attributes,
          groupId: message.groupId,
        })
        .catch((error) => {
          logger.error(
            `Memory queue "${queueName}": failed to dead-letter message ${message.id} to "${dlqName}"`,
            error,
          )
        })
    } else {
      logger.error(
        `Memory queue "${queueName}": message ${message.id} exceeded ${maxReceiveCount()} deliveries and no dead-letter queue is configured — message dropped`,
      )
    }
  }

  /**
   * Collects and leases up to `max` deliverable messages, applying delayed
   * visibility, retention expiry, FIFO group head-of-line blocking, and the
   * dead-letter delivery cap. Mutates lease state (at-least-once bookkeeping).
   */
  const leaseMessages = (max: number, visibilityTimeoutMs: number): StoredMessage[] => {
    if (max <= 0) return []
    const now = Date.now()
    const leased: StoredMessage[] = []
    const blockedGroups = new Set<string>()
    if (config.fifo) {
      for (const message of messages) {
        if (message.leaseExpiresAt !== null && message.leaseExpiresAt > now) {
          blockedGroups.add(message.groupId ?? '')
        }
      }
    }
    // Iterate a copy — retention expiry and dead-lettering splice the array.
    for (const message of [...messages]) {
      if (leased.length >= max) break
      if (message.leaseExpiresAt !== null && message.leaseExpiresAt > now) continue
      if (
        config.messageRetentionSeconds !== undefined &&
        message.sentAt.getTime() + config.messageRetentionSeconds * 1000 <= now
      ) {
        removeMessage(message)
        logger.debug(
          `Memory queue "${queueName}": message ${message.id} exceeded retention (${config.messageRetentionSeconds}s) — discarded`,
        )
        continue
      }
      if (config.fifo) {
        const group = message.groupId ?? ''
        if (blockedGroups.has(group)) continue
        // Head-of-line: later messages in this group must not overtake this
        // one, whether it's delivered now, still delayed, or dead-lettered.
        blockedGroups.add(group)
      }
      if (message.visibleAt > now) continue
      if (message.receiveCount >= maxReceiveCount()) {
        deadLetter(message)
        continue
      }
      message.leaseExpiresAt = now + visibilityTimeoutMs
      message.receiveCount += 1
      message.receiptHandle = crypto.randomUUID()
      leased.push(message)
    }
    return leased
  }

  /**
   * Wraps a leased message for the consumer. `ack()`/`nack()` only act while
   * this delivery's receipt handle is still current — once the lease expires
   * and the message is redelivered, stale receipts become documented no-ops
   * (making `ack()` idempotent and late acks after redelivery harmless).
   */
  const toReceivedMessage = <T>(message: StoredMessage): ReceivedMessage<T> => {
    const receipt = message.receiptHandle
    return {
      id: message.id,
      body: structuredClone(message.body) as T,
      receiptHandle: receipt,
      attributes: message.attributes ? { ...message.attributes } : undefined,
      receiveCount: message.receiveCount,
      sentTimestamp: message.sentAt,

      async ack(): Promise<void> {
        if (message.receiptHandle === receipt && isStored(message)) {
          removeMessage(message)
          pump()
        }
      },

      async nack(): Promise<void> {
        if (message.receiptHandle === receipt && isStored(message)) {
          message.leaseExpiresAt = null
          message.visibleAt = Date.now() + config.redeliveryDelaySeconds * 1000
          pump()
        }
      },
    }
  }

  /**
   * Leases a message to a subscriber and runs its handler. Handler success
   * auto-acks (a no-op if the handler already acked or the lease rotated);
   * handler failure logs and returns the message for redelivery.
   */
  const dispatch = (subscriber: SubscriberState, message: StoredMessage): void => {
    const received = toReceivedMessage<unknown>(message)
    const receipt = message.receiptHandle
    void (async () => {
      try {
        await subscriber.handler(received)
        if (message.receiptHandle === receipt && isStored(message)) {
          removeMessage(message)
        }
      } catch (error) {
        logger.warn(
          `Memory queue "${queueName}": subscriber handler failed for message ${message.id} — scheduling redelivery in ${config.handlerFailureRedeliveryDelaySeconds}s`,
          error,
        )
        if (message.receiptHandle === receipt && isStored(message)) {
          message.leaseExpiresAt = null
          // An uncaught throw is an UNPLANNED failure (e.g. a transient
          // downstream 503) — give it a real retry window instead of the
          // instant redelivery an explicit nack() gets. With the default
          // maxReceiveCount of 3, a 0-delay default here would burn every
          // attempt within milliseconds and drop the message with no real
          // chance to recover.
          message.visibleAt = Date.now() + config.handlerFailureRedeliveryDelaySeconds * 1000
        }
      } finally {
        subscriber.active -= 1
        pump()
      }
    })()
  }

  /**
   * Arms the single wake timer for the earliest future event (delayed
   * visibility or lease expiry) — only while someone (subscriber or long-poll
   * waiter) is waiting for delivery; a fully idle queue holds no timer.
   */
  const scheduleNextWake = (): void => {
    if (wakeTimer) {
      clearTimeout(wakeTimer)
      wakeTimer = null
    }
    if (closed) return
    if (subscribers.size === 0 && waiters.size === 0) return
    const now = Date.now()
    let next = Infinity
    for (const message of messages) {
      if (message.leaseExpiresAt !== null && message.leaseExpiresAt > now) {
        next = Math.min(next, message.leaseExpiresAt)
      } else if (message.visibleAt > now) {
        next = Math.min(next, message.visibleAt)
      }
    }
    if (!Number.isFinite(next)) return
    wakeTimer = setTimeout(
      () => {
        wakeTimer = null
        pump()
      },
      Math.max(1, next - now),
    )
    wakeTimer.unref?.()
  }

  /**
   * Delivery engine: dispatches deliverable messages to subscribers with free
   * capacity, satisfies pending long-poll waiters, then re-arms the wake
   * timer. Called after every state change.
   */
  const pump = (): void => {
    if (closed) return
    for (const subscriber of subscribers.values()) {
      while (subscriber.active < subscriber.concurrency) {
        const [message] = leaseMessages(1, subscriber.visibilityTimeoutMs)
        if (!message) break
        subscriber.active += 1
        dispatch(subscriber, message)
      }
    }
    for (const waiter of [...waiters]) {
      const leased = leaseMessages(waiter.maxMessages, waiter.visibilityTimeoutMs)
      if (leased.length > 0) {
        waiters.delete(waiter)
        clearTimeout(waiter.timer)
        waiter.resolve(leased.map((message) => toReceivedMessage<unknown>(message)))
      }
    }
    scheduleNextWake()
  }

  const assertOpen = (): void => {
    if (closed) {
      throw new Error(`Memory queue "${queueName}" is closed`)
    }
  }

  const queue: Queue = {
    name: queueName,

    async send<T = unknown>(message: QueueMessage<T>): Promise<string> {
      assertOpen()
      const now = Date.now()
      if (config.fifo && message.deduplicationId) {
        pruneDedup(now)
        const existing = dedupIds.get(message.deduplicationId)
        if (existing) return existing.id
      }
      const id = message.id ?? crypto.randomUUID()
      const stored: StoredMessage = {
        id,
        // Clone like a real broker serializes — post-send mutations of the
        // caller's object must not affect what consumers receive.
        body: structuredClone(message.body),
        attributes: message.attributes ? { ...message.attributes } : undefined,
        groupId: message.groupId,
        sentAt: new Date(now),
        visibleAt: now + (message.delaySeconds ?? 0) * 1000,
        leaseExpiresAt: null,
        receiveCount: 0,
        receiptHandle: '',
      }
      messages.push(stored)
      if (config.fifo && message.deduplicationId) {
        dedupIds.set(message.deduplicationId, { id, expiresAt: now + DEDUP_WINDOW_MS })
      }
      pump()
      return id
    },

    async sendBatch<T = unknown>(batch: QueueMessage<T>[]): Promise<string[]> {
      const ids: string[] = []
      for (const message of batch) {
        ids.push(await this.send(message))
      }
      return ids
    },

    async receive<T = unknown>(options?: ReceiveOptions): Promise<ReceivedMessage<T>[]> {
      if (closed) return []
      const maxMessages = options?.maxMessages ?? 10
      const visibilityTimeoutMs =
        (options?.visibilityTimeout ?? config.defaultVisibilityTimeoutSeconds) * 1000
      const leased = leaseMessages(maxMessages, visibilityTimeoutMs)
      if (leased.length > 0 || !options?.waitTimeSeconds) {
        scheduleNextWake()
        return leased.map((message) => toReceivedMessage<T>(message))
      }
      // Long poll: resolve as soon as a message becomes available, or with
      // `[]` when `waitTimeSeconds` elapses (or the queue closes).
      const waitTimeMs = options.waitTimeSeconds * 1000
      return new Promise<ReceivedMessage<T>[]>((resolve) => {
        const waiter: Waiter = {
          maxMessages,
          visibilityTimeoutMs,
          resolve: resolve as (received: ReceivedMessage<unknown>[]) => void,
          timer: setTimeout(() => {
            waiters.delete(waiter)
            resolve([])
          }, waitTimeMs),
        }
        waiter.timer.unref?.()
        waiters.add(waiter)
        scheduleNextWake()
      })
    },

    subscribe<T = unknown>(handler: MessageHandler<T>, options?: ReceiveOptions): () => void {
      assertOpen()
      const subscriberId = crypto.randomUUID()
      const subscriber: SubscriberState = {
        handler: handler as MessageHandler<unknown>,
        concurrency: options?.maxMessages ?? 1,
        visibilityTimeoutMs:
          (options?.visibilityTimeout ?? config.defaultVisibilityTimeoutSeconds) * 1000,
        active: 0,
      }
      subscribers.set(subscriberId, subscriber)
      pump()
      return () => {
        subscribers.delete(subscriberId)
        scheduleNextWake()
      }
    },

    async size(): Promise<number> {
      // Ready + delayed + in-flight, mirroring the Redis bond's
      // waiting + active + delayed job counts.
      return messages.length
    },

    async purge(): Promise<void> {
      messages.length = 0
      scheduleNextWake()
    },
  }

  const close = (): void => {
    if (closed) return
    closed = true
    if (wakeTimer) {
      clearTimeout(wakeTimer)
      wakeTimer = null
    }
    for (const waiter of waiters) {
      clearTimeout(waiter.timer)
      waiter.resolve([])
    }
    waiters.clear()
    subscribers.clear()
    messages.length = 0
    dedupIds.clear()
  }

  return { queue, close }
}
