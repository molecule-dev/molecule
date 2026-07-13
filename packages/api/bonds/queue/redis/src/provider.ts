/**
 * Redis/BullMQ queue provider implementation.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'
import type { ConnectionOptions } from 'bullmq'
import { Queue as BullQueue } from 'bullmq'

import type { Queue, QueueCreateOptions, QueueProvider } from '@molecule/api-queue'

import { createQueue } from './queue.js'
import type { RedisQueueOptions } from './types.js'

/**
 * Creates a Redis/BullMQ queue provider. Connects to Redis using `REDIS_URL` or
 * individual `REDIS_HOST`/`PORT`/`PASSWORD` env vars. Queue names are prefixed with `molecule:queue:` by default.
 *
 * The producer connection (send/receive/size/purge/delete) is configured to fail fast — a
 * bounded `maxRetriesPerRequest` and `enableOfflineQueue: false` — instead of buffering
 * commands indefinitely while Redis is unreachable, which previously made `await send()` hang
 * forever with no actionable error. The worker connection (`subscribe()`) keeps ioredis's
 * default indefinite-retry behavior — BullMQ requires `maxRetriesPerRequest: null` there, and
 * a long-running background consumer SHOULD keep trying to reconnect rather than give up.
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

  // Producer-only fail-fast overlay. BullMQ forces `maxRetriesPerRequest: null`
  // on any BLOCKING connection (the Worker's) regardless of what's passed in —
  // applying this to the worker connection too would just print a console
  // warning and be silently overridden, so it is deliberately producer-only.
  const producerConnection: ConnectionOptions = {
    ...connection,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  }

  const queues = new Map<string, Queue>()
  // Disposers registered by each createQueue(), keyed by queue name so
  // `deleteQueue()` can run and unregister a SPECIFIC queue's disposer
  // instead of leaving its connection open until `provider.close()`.
  const cleanups = new Map<string, () => Promise<void>>()

  const getQueue = (name: string): Queue => {
    let q = queues.get(name)
    if (!q) {
      q = createQueue(
        { producer: producerConnection, worker: connection },
        name,
        prefix,
        (cleanup) => cleanups.set(name, cleanup),
      )
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
        // Run and unregister the queue's OWN disposer first (closes its
        // workers and its cached BullQueue's Redis connection) — previously
        // this connection stayed open, unused, until provider.close() (which
        // may never be called for a long-running process).
        const cleanup = cleanups.get(name)
        if (cleanup) {
          await cleanup()
          cleanups.delete(name)
        }
        queues.delete(name)
      }

      // Obliterate via a short-lived connection of its own (the original's
      // was just closed above) — always closed afterward so this temporary
      // connection never leaks either.
      const bullQueue = new BullQueue(name, { connection: producerConnection, prefix })
      try {
        await bullQueue.obliterate({ force: true })
      } finally {
        await bullQueue.close()
      }
    },

    async close(): Promise<void> {
      // Run every disposer (workers + BullMQ queues). The previous
      // implementation iterated an always-empty array, so close() silently
      // leaked every Redis connection and kept the process alive.
      for (const cleanup of cleanups.values()) {
        await cleanup()
      }
      cleanups.clear()
      queues.clear()
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
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
