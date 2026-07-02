/**
 * In-memory queue provider implementation.
 *
 * A zero-dependency, zero-configuration queue provider for development and
 * testing. No broker process, no credentials, no environment variables.
 *
 * @module
 */

import type { Queue, QueueCreateOptions, QueueProvider } from '@molecule/api-queue'

import { createQueue } from './queue.js'
import type { MemoryQueueHandle, MemoryQueueOptions } from './types.js'

/**
 * Creates an in-memory queue provider. Queues are created implicitly on first
 * access (like the Redis bond) or explicitly via `createQueue()` with FIFO,
 * visibility-timeout, retention, and dead-letter options. All state lives in
 * this process and is lost on restart.
 *
 * @param options - Optional delivery defaults (visibility timeout, delivery cap, redelivery delay). Everything defaults sensibly — no configuration is required.
 * @returns A `QueueProvider` backed by in-process queues.
 */
export const createProvider = (options?: MemoryQueueOptions): QueueProvider => {
  const visibilityTimeoutSeconds = options?.visibilityTimeoutSeconds ?? 30
  const maxReceiveCount = options?.maxReceiveCount ?? 3
  const redeliveryDelaySeconds = options?.redeliveryDelaySeconds ?? 0

  const handles = new Map<string, MemoryQueueHandle>()

  const getOrCreateQueue = (name: string, createOptions?: QueueCreateOptions): Queue => {
    let handle = handles.get(name)
    if (!handle) {
      handle = createQueue(name, {
        defaultVisibilityTimeoutSeconds:
          createOptions?.visibilityTimeout ?? visibilityTimeoutSeconds,
        maxReceiveCount,
        redeliveryDelaySeconds,
        fifo: createOptions?.fifo ?? false,
        messageRetentionSeconds: createOptions?.messageRetentionSeconds,
        deadLetterQueue: createOptions?.deadLetterQueue,
        resolveQueue: (dlqName) => getOrCreateQueue(dlqName),
      })
      handles.set(name, handle)
    }
    return handle.queue
  }

  const provider: QueueProvider = {
    queue(name: string): Queue {
      return getOrCreateQueue(name)
    },

    async listQueues(): Promise<string[]> {
      return Array.from(handles.keys())
    },

    async createQueue(name: string, createOptions?: QueueCreateOptions): Promise<Queue> {
      // Like the Redis bond: returns the existing queue when already created
      // (creation options only apply to a queue's first creation).
      return getOrCreateQueue(name, createOptions)
    },

    async deleteQueue(name: string): Promise<void> {
      const handle = handles.get(name)
      if (handle) {
        handle.close()
        handles.delete(name)
      }
    },

    async close(): Promise<void> {
      for (const handle of handles.values()) {
        handle.close()
      }
      handles.clear()
    },
  }

  return provider
}

/** Lazily-initialized in-memory queue provider, created on first property access via a Proxy. */
let _provider: QueueProvider | null = null

/**
 * Lazily-initialized in-memory queue provider proxy that creates the provider on first access.
 */
export const provider: QueueProvider = new Proxy({} as QueueProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
