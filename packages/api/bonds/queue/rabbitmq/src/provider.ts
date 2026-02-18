/**
 * RabbitMQ queue provider implementation.
 *
 * @module
 */

import amqp from 'amqplib'

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
import { t } from '@molecule/api-i18n'
import type { Queue, QueueCreateOptions, QueueProvider } from '@molecule/api-queue'

import { createQueue } from './queue.js'
import type { RabbitMQOptions } from './types.js'

/**
 * Creates a RabbitMQ queue provider by connecting to an AMQP server and opening a channel.
 * Connection URL is built from `RABBITMQ_URL` or individual `RABBITMQ_HOST`/`PORT`/`USER`/`PASSWORD`/`VHOST` env vars.
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

  let connection: Awaited<ReturnType<typeof amqp.connect>>
  let channel: Awaited<ReturnType<typeof connection.createChannel>>

  try {
    connection = await amqp.connect(connectionUrl)
    channel = await connection.createChannel()

    if (options?.prefetch) {
      channel.prefetch(options.prefetch)
    }

    logger.debug('RabbitMQ connected')
  } catch (error) {
    logger.error('RabbitMQ connection error:', error)
    throw error
  }

  connection.on('error', (error) => {
    logger.error('RabbitMQ connection error:', error)
  })

  connection.on('close', () => {
    logger.debug('RabbitMQ connection closed')
  })

  const queues = new Map<string, Queue>()

  const getQueue = (name: string): Queue => {
    let q = queues.get(name)
    if (!q) {
      q = createQueue(channel, name)
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
      const options: amqp.Options.AssertQueue = {
        durable: true,
        arguments: {},
      }

      if (queueOptions?.messageRetentionSeconds) {
        options.arguments!['x-message-ttl'] = queueOptions.messageRetentionSeconds * 1000
      }

      if (queueOptions?.maxMessageSize) {
        options.arguments!['x-max-length-bytes'] = queueOptions.maxMessageSize
      }

      if (queueOptions?.deadLetterQueue) {
        options.arguments!['x-dead-letter-exchange'] = ''
        options.arguments!['x-dead-letter-routing-key'] = queueOptions.deadLetterQueue.name
      }

      await channel.assertQueue(name, options)
      return getQueue(name)
    },

    async deleteQueue(name: string): Promise<void> {
      await channel.deleteQueue(name)
      queues.delete(name)
    },

    async close(): Promise<void> {
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
      connectPromise = createProvider().then((p) => {
        realProvider = p
        return p
      })
    }
    return connectPromise
  }

  return {
    queue(name: string) {
      if (realProvider) return realProvider.queue(name)

      // Return a lazy queue that defers operations until connected
      const pending = ensureConnected()
      return {
        name,
        async send(message) {
          const p = await pending
          return p.queue(name).send(message)
        },
        async sendBatch(messages) {
          const p = await pending
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
          const p = await pending
          return p.queue(name).receive(options)
        },
        subscribe(handler, options) {
          let unsubscribe: (() => void) | null = null
          pending
            .then((p) => {
              unsubscribe = p.queue(name).subscribe(handler, options)
            })
            .catch((error) => {
              logger.error('RabbitMQ lazy subscribe error:', error)
            })
          return () => {
            unsubscribe?.()
          }
        },
        async size() {
          const p = await pending
          return p.queue(name).size?.() ?? 0
        },
        async purge() {
          const p = await pending
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
