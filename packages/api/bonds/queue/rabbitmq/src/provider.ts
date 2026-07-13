/**
 * RabbitMQ queue provider implementation.
 *
 * @module
 */

import amqp from 'amqplib'

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import { t } from '@molecule/api-i18n'
import type { Queue, QueueCreateOptions, QueueProvider } from '@molecule/api-queue'

import { createQueue, type RabbitMQQueue } from './queue.js'
import type { RabbitMQOptions } from './types.js'

const RECONNECT_INITIAL_DELAY_MS = 1000
const RECONNECT_MAX_DELAY_MS = 30000

/**
 * Creates a RabbitMQ queue provider by connecting to an AMQP server and opening a channel.
 * Connection URL is built from `RABBITMQ_URL` or individual `RABBITMQ_HOST`/`PORT`/`USER`/`PASSWORD`/`VHOST` env vars.
 *
 * The FIRST connection attempt fails fast (rejects) so a bad URL/unreachable broker is caught
 * immediately at boot — matching the fail-fast pattern used elsewhere in the fleet. Once connected,
 * a dropped connection OR a channel-killing broker error (e.g. re-asserting a queue with mismatched
 * arguments) is recovered automatically with bounded exponential backoff, and every active
 * `subscribe()` consumer is re-attached to the fresh channel — a single failure no longer
 * permanently breaks every queue for the life of the process.
 * @param options - Optional connection and prefetch configuration. Falls back to environment variables.
 * @returns A `QueueProvider` that manages RabbitMQ queues over the established AMQP channel.
 */
export const createProvider = async (options?: RabbitMQOptions): Promise<QueueProvider> => {
  const url = options?.url ?? process.env.RABBITMQ_URL
  const host = options?.host ?? process.env.RABBITMQ_HOST ?? 'localhost'
  const port = options?.port ?? parseInt(process.env.RABBITMQ_PORT ?? '5672', 10)
  const username = options?.username ?? process.env.RABBITMQ_USER ?? 'guest'
  const password = options?.password ?? process.env.RABBITMQ_PASSWORD ?? 'guest'
  const vhost = options?.vhost ?? process.env.RABBITMQ_VHOST ?? '/'

  const connectionUrl = url ?? `amqp://${username}:${password}@${host}:${port}${vhost}`

  const queues = new Map<string, RabbitMQQueue>()

  let connection!: Awaited<ReturnType<typeof amqp.connect>>
  let channel!: Awaited<ReturnType<typeof connection.createChannel>>
  let closing = false
  let reconnectAttempt = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  // Every Queue is built against this proxy, never a raw channel — so a
  // reconnect that swaps `channel` out from under it is transparent to
  // already-returned Queue handles (each call reads `channel` fresh).
  const channelProxy = new Proxy({} as typeof channel, {
    get(_target, prop) {
      const value = Reflect.get(channel, prop, channel)
      return typeof value === 'function' ? value.bind(channel) : value
    },
  })

  const dial = async (): Promise<{
    connection: typeof connection
    channel: typeof channel
  }> => {
    const conn = await amqp.connect(connectionUrl)
    const ch = await conn.createChannel()

    if (options?.prefetch) {
      // amqplib's prefetch is async — un-awaited, consumers could start
      // before the QoS cap is applied (and a rejection would be unhandled).
      await ch.prefetch(options.prefetch)
    }

    return { connection: conn, channel: ch }
  }

  const resubscribeAll = async (): Promise<void> => {
    for (const q of queues.values()) {
      try {
        await q.reattachSubscribers()
      } catch (error) {
        logger.error(`RabbitMQ resubscribe error for queue "${q.name}" after reconnect:`, error)
      }
    }
  }

  const scheduleReconnect = (): void => {
    if (closing || reconnectTimer) return

    const delay = Math.min(
      RECONNECT_MAX_DELAY_MS,
      RECONNECT_INITIAL_DELAY_MS * 2 ** reconnectAttempt,
    )
    reconnectAttempt += 1

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      dial()
        .then(async ({ connection: conn, channel: ch }) => {
          connection = conn
          channel = ch
          reconnectAttempt = 0
          attachRecoveryHandlers(conn, ch)
          logger.debug('RabbitMQ reconnected')
          await resubscribeAll()
        })
        .catch((error) => {
          logger.error('RabbitMQ reconnect attempt failed — will retry:', error)
          scheduleReconnect()
        })
    }, delay)
  }

  // Attaches recovery listeners to a specific connection/channel pair.
  // Either one closing unexpectedly triggers a full reconnect: it is
  // simpler and always correct (a channel-only recreate would still need
  // the same resubscribe pass), at the cost of also re-dialing the TCP
  // connection when only the channel died.
  const attachRecoveryHandlers = (conn: typeof connection, ch: typeof channel): void => {
    const onDown =
      (source: 'connection' | 'channel') =>
      (error?: Error): void => {
        if (closing || connection !== conn) return
        logger.error(
          `RabbitMQ ${source} closed unexpectedly — reconnecting (subscriptions pause until reconnected; RABBITMQ_URL/RABBITMQ_HOST may be wrong or the broker may be down)`,
          error,
        )
        scheduleReconnect()
      }

    conn.on('error', (error) => {
      logger.error('RabbitMQ connection error:', error)
    })
    conn.on('close', onDown('connection'))
    ch.on('error', (error) => {
      logger.error('RabbitMQ channel error:', error)
    })
    ch.on('close', onDown('channel'))
  }

  try {
    ;({ connection, channel } = await dial())
    logger.debug('RabbitMQ connected')
  } catch (error) {
    logger.error('RabbitMQ connection error:', error)
    throw error
  }

  attachRecoveryHandlers(connection, channel)

  const getQueue = (name: string): RabbitMQQueue => {
    let q = queues.get(name)
    if (!q) {
      q = createQueue(channelProxy, name)
      queues.set(name, q)
    }
    return q
  }

  const provider: QueueProvider = {
    queue: getQueue,

    async listQueues(): Promise<string[]> {
      // RabbitMQ doesn't have a simple way to list queues via AMQP
      // This would require the management plugin API
      return Array.from(queues.keys())
    },

    async createQueue(name: string, queueOptions?: QueueCreateOptions): Promise<Queue> {
      const assertOptions: amqp.Options.AssertQueue = {
        durable: true,
        arguments: {},
      }

      if (queueOptions?.messageRetentionSeconds) {
        assertOptions.arguments!['x-message-ttl'] = queueOptions.messageRetentionSeconds * 1000
      }

      if (queueOptions?.maxMessageSize) {
        assertOptions.arguments!['x-max-length-bytes'] = queueOptions.maxMessageSize
      }

      if (queueOptions?.deadLetterQueue) {
        assertOptions.arguments!['x-dead-letter-exchange'] = ''
        assertOptions.arguments!['x-dead-letter-routing-key'] = queueOptions.deadLetterQueue.name
      }

      await channelProxy.assertQueue(name, assertOptions)
      return getQueue(name)
    },

    async deleteQueue(name: string): Promise<void> {
      await channelProxy.deleteQueue(name)
      queues.delete(name)
    },

    async close(): Promise<void> {
      closing = true
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      await channel.close()
      await connection.close()
    },
  }

  return provider
}

/** Alias for `createProvider`. Connects to RabbitMQ and returns a `QueueProvider`. */
export const connect = createProvider

/**
 * Default lazily-initialized RabbitMQ provider. The AMQP connection is established
 * on first method call. All methods proxy through to the real provider once connected.
 * Queue operations issued before the connection is ready are deferred automatically.
 */
export const provider: QueueProvider = (() => {
  let realProvider: QueueProvider | null = null
  let connectPromise: Promise<QueueProvider> | null = null

  const ensureConnected = async (): Promise<QueueProvider> => {
    if (realProvider) return realProvider
    if (!connectPromise) {
      connectPromise = createProvider()
        .then((p) => {
          realProvider = p
          return p
        })
        .catch((error) => {
          // Allow the NEXT call to retry instead of permanently replaying
          // this one rejection forever — a cached rejected promise would
          // wedge every future operation even after RABBITMQ_URL becomes
          // reachable (e.g. `docker compose up` finishes after the app boots).
          connectPromise = null
          throw error
        })
    }
    return connectPromise
  }

  return {
    queue(name: string) {
      if (realProvider) return realProvider.queue(name)

      // Every method resolves the connection fresh via `ensureConnected()`
      // rather than capturing a single snapshot promise — a queue handle
      // obtained before the broker was reachable keeps working once it
      // comes up, instead of replaying the same connection failure forever.
      return {
        name,
        async send(message) {
          const p = await ensureConnected()
          return p.queue(name).send(message)
        },
        async sendBatch(messages) {
          const p = await ensureConnected()
          const q = p.queue(name)
          if (!q.sendBatch)
            throw new Error(
              t('queue.rabbitmq.error.sendBatchNotSupported', undefined, {
                defaultValue: 'sendBatch not supported',
              }),
            )
          return q.sendBatch(messages)
        },
        async receive(options) {
          const p = await ensureConnected()
          return p.queue(name).receive(options)
        },
        subscribe(handler, options) {
          let unsubscribe: (() => void) | null = null
          let cancelled = false
          let attempt = 0

          const trySubscribe = (): void => {
            if (cancelled) return
            ensureConnected()
              .then((p) => {
                if (cancelled) return
                unsubscribe = p.queue(name).subscribe(handler, options)
              })
              .catch((error) => {
                logger.error(`RabbitMQ lazy subscribe error (queue "${name}") — retrying:`, error)
                if (cancelled) return
                const delay = Math.min(
                  RECONNECT_MAX_DELAY_MS,
                  RECONNECT_INITIAL_DELAY_MS * 2 ** attempt,
                )
                attempt += 1
                setTimeout(trySubscribe, delay)
              })
          }

          trySubscribe()

          return () => {
            cancelled = true
            unsubscribe?.()
          }
        },
        async size() {
          const p = await ensureConnected()
          return p.queue(name).size?.() ?? 0
        },
        async purge() {
          const p = await ensureConnected()
          await p.queue(name).purge?.()
        },
      } as Queue
    },

    async listQueues() {
      const p = await ensureConnected()
      return p.listQueues?.() ?? []
    },

    async createQueue(name, options) {
      const p = await ensureConnected()
      if (!p.createQueue)
        throw new Error(
          t('queue.rabbitmq.error.createQueueNotSupported', undefined, {
            defaultValue: 'createQueue not supported',
          }),
        )
      return p.createQueue(name, options)
    },

    async deleteQueue(name) {
      const p = await ensureConnected()
      await p.deleteQueue?.(name)
    },

    async close() {
      if (realProvider) {
        await realProvider.close?.()
        realProvider = null
        connectPromise = null
      }
    },
  }
})()
