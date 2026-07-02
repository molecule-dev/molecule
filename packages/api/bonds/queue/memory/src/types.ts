/**
 * Type definitions for the in-memory queue provider.
 *
 * @module
 */

import type { Queue, QueueCreateOptions } from '@molecule/api-queue'

// Re-export core interface types
export type {
  MessageHandler,
  Queue,
  QueueCreateOptions,
  QueueMessage,
  QueueProvider,
  ReceivedMessage,
  ReceiveOptions,
} from '@molecule/api-queue'

/**
 * Options for creating an in-memory queue provider.
 *
 * All options have working defaults — the provider is fully functional with
 * zero configuration and zero environment variables.
 */
export interface MemoryQueueOptions {
  /**
   * Default visibility timeout in seconds applied to received/dispatched
   * messages when `ReceiveOptions.visibilityTimeout` is not given.
   * A leased (in-flight) message whose lease expires without an `ack()`
   * becomes visible again and is redelivered (at-least-once delivery).
   * Defaults to `30`.
   */
  visibilityTimeoutSeconds?: number

  /**
   * Maximum number of times a message may be delivered before it is routed
   * to the queue's dead-letter queue (when configured via
   * `QueueCreateOptions.deadLetterQueue`) or dropped with an error log.
   * Mirrors the Redis bond's `attempts: 3`. Defaults to `3`.
   */
  maxReceiveCount?: number

  /**
   * Delay in seconds before a message is redelivered after a subscriber
   * handler failure or a `nack()`. Defaults to `0` (immediate redelivery).
   */
  redeliveryDelaySeconds?: number
}

/**
 * Internal configuration for a single in-memory queue instance, resolved by
 * the provider from `MemoryQueueOptions` and per-queue `QueueCreateOptions`.
 */
export interface MemoryQueueConfig {
  /**
   * Default visibility timeout in seconds for leases without an explicit
   * `ReceiveOptions.visibilityTimeout`.
   */
  defaultVisibilityTimeoutSeconds: number

  /**
   * Maximum deliveries before dead-lettering/dropping. Overridden per queue
   * by `deadLetterQueue.maxReceiveCount` when a dead-letter queue is set.
   */
  maxReceiveCount: number

  /**
   * Delay in seconds before redelivery after handler failure or `nack()`.
   */
  redeliveryDelaySeconds: number

  /**
   * Whether this queue enforces FIFO semantics (per-`groupId` ordered,
   * head-of-line-blocking delivery plus `deduplicationId` deduplication).
   */
  fifo: boolean

  /**
   * Optional retention period in seconds; messages older than this are
   * discarded when next scanned.
   */
  messageRetentionSeconds?: number

  /**
   * Optional dead-letter queue for messages exceeding the delivery cap.
   */
  deadLetterQueue?: QueueCreateOptions['deadLetterQueue']

  /**
   * Resolves another queue by name — used to route dead-lettered messages.
   */
  resolveQueue: (name: string) => Queue
}

/**
 * Handle pairing a `Queue` with the internal lifecycle control the provider
 * uses to shut it down (`close()` is not part of the core `Queue` interface).
 */
export interface MemoryQueueHandle {
  /**
   * The in-memory queue implementation.
   */
  queue: Queue

  /**
   * Stops all timers, resolves pending long-polls with `[]`, discards all
   * messages and subscribers, and rejects further sends.
   */
  close(): void
}
