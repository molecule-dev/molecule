/**
 * Redis/BullMQ queue provider implementation.
 *
 * @module
 */

import type { ConnectionOptions } from 'bullmq'
import { Queue as BullQueue } from 'bullmq'

import type { Queue, QueueCreateOptions, QueueProvider } from '@molecule/api-queue'

import { createQueue } from './queue.js'
import type { RedisQueueOptions } from './types.js'

/**
 * Creates a Redis/BullMQ queue provider. Connects to Redis using `REDIS_URL` or
 * individual `REDIS_HOST`/`PORT`/`PASSWORD` env vars. Queue names are prefixed with `molecule:queue:` by default.
 * @param options - Optional connection and prefix configuration. Falls back to environment variables.
 * @returns A `QueueProvider` that manages BullMQ queues backed by Redis.
 */
export const createProvider = (options?: RedisQueueOptions): QueueProvider => {
  const url = options?.url ?? process.env.REDIS_URL
  const host = options?.host ?? process.env.REDIS_HOST ?? 'localhost'
  const port = options?.port ?? parseInt(process.env.REDIS_PORT ?? '6379', 10)
  const password = options?.password ?? process.env.REDIS_PASSWORD
  const prefix = options?.prefix ?? 'molecule:queue:'

  const connection: ConnectionOptions = url
    ? { url }
    : {
        host,
        port,
        password,
      }

  const queues = new Map<string, Queue>()
  const bullQueues: BullQueue[] = []

  const getQueue = (name: string): Queue => {
    let q = queues.get(name)
    if (!q) {
      q = createQueue(connection, name, prefix)
      queues.set(name, q)
    }
    return q
  }

  const provider: QueueProvider = {
    queue: getQueue,

    async listQueues(): Promise<string[]> {
      // BullMQ doesn't have a built-in way to list all queues
      // We can only return the ones we know about
      return Array.from(queues.keys())
    },

    async createQueue(name: string, _queueOptions?: QueueCreateOptions): Promise<Queue> {
      // BullMQ queues are created implicitly
      // We can set some options via the job options
      return getQueue(name)
    },

    async deleteQueue(name: string): Promise<void> {
      const q = queues.get(name)
      if (q) {
        // Get the underlying BullQueue and obliterate it
        const bullQueue = new BullQueue(name, { connection, prefix })
        await bullQueue.obliterate({ force: true })
        await bullQueue.close()
        queues.delete(name)
      }
    },

    async close(): Promise<void> {
      for (const bullQueue of bullQueues) {
        await bullQueue.close()
      }
    },
  }

  return provider
}

/** Lazily-initialized Redis/BullMQ queue provider, created on first property access via a Proxy. */
let _provider: QueueProvider | null = null

/**
 * Lazily-initialized Redis/BullMQ queue provider proxy that creates the provider on first access.
 */
export const provider: QueueProvider = new Proxy({} as QueueProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
