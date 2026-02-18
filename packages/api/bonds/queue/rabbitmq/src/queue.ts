/**
 * RabbitMQ queue implementation.
 *
 * @module
 */

import type amqp from 'amqplib'
import type { Channel, ConsumeMessage, GetMessage } from 'amqplib'

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
import type {
  MessageHandler,
  Queue,
  QueueMessage,
  ReceivedMessage,
  ReceiveOptions,
} from '@molecule/api-queue'

/**
 * Creates a `Queue` backed by a RabbitMQ channel. Supports send, receive (pull via `channel.get`),
 * subscribe (push via `channel.consume`), size, and purge. Messages are persisted as durable by default.
 * @param channel - The open amqplib channel to use for all queue operations.
 * @param queueName - The RabbitMQ queue name to operate on.
 * @returns A `Queue` object with send/receive/subscribe/size/purge methods bound to the queue.
 */
export const createQueue = (channel: Channel, queueName: string): Queue => {
  const subscribers: Map<string, { consumerTag: string }> = new Map()

  return {
    name: queueName,

    async send<T = unknown>(message: QueueMessage<T>): Promise<string> {
      const id = message.id ?? crypto.randomUUID()
      const content = Buffer.from(JSON.stringify(message.body))

      const options: amqp.Options.Publish = {
        messageId: id,
        persistent: true,
        headers: message.attributes,
      }

      if (message.delaySeconds) {
        // RabbitMQ requires the rabbitmq-delayed-message-exchange plugin for delays
        options.headers = {
          ...options.headers,
          'x-delay': message.delaySeconds * 1000,
        }
      }

      await channel.assertQueue(queueName, { durable: true })
      channel.sendToQueue(queueName, content, options)

      return id
    },

    async sendBatch<T = unknown>(messages: QueueMessage<T>[]): Promise<string[]> {
      const ids: string[] = []
      for (const message of messages) {
        const id = await this.send(message)
        ids.push(id)
      }
      return ids
    },

    async receive<T = unknown>(options?: ReceiveOptions): Promise<ReceivedMessage<T>[]> {
      await channel.assertQueue(queueName, { durable: true })

      const messages: ReceivedMessage<T>[] = []
      const maxMessages = options?.maxMessages ?? 10

      for (let i = 0; i < maxMessages; i++) {
        const msg = await channel.get(queueName, { noAck: false })
        if (!msg) break

        messages.push(createReceivedMessageFromGet<T>(channel, msg))
      }

      return messages
    },

    subscribe<T = unknown>(handler: MessageHandler<T>, options?: ReceiveOptions): () => void {
      const subscriberId = crypto.randomUUID()

      const setup = async (): Promise<void> => {
        await channel.assertQueue(queueName, { durable: true })

        if (options?.maxMessages) {
          channel.prefetch(options.maxMessages)
        }

        const { consumerTag } = await channel.consume(
          queueName,
          async (msg) => {
            if (!msg) return

            const receivedMessage = createReceivedMessage<T>(channel, msg)
            try {
              await handler(receivedMessage)
            } catch (error) {
              logger.error('RabbitMQ message handler error:', error)
              // Nack without requeue on handler error
              channel.nack(msg, false, false)
            }
          },
          { noAck: false },
        )

        subscribers.set(subscriberId, { consumerTag })
      }

      setup().catch((error) => {
        logger.error('RabbitMQ subscribe error:', error)
      })

      return () => {
        const sub = subscribers.get(subscriberId)
        if (sub) {
          channel.cancel(sub.consumerTag).catch((error) => {
            logger.error('RabbitMQ unsubscribe error:', error)
          })
          subscribers.delete(subscriberId)
        }
      }
    },

    async size(): Promise<number> {
      const { messageCount } = await channel.assertQueue(queueName, { durable: true })
      return messageCount
    },

    async purge(): Promise<void> {
      await channel.purgeQueue(queueName)
    },
  }
}

/**
 * Wraps an amqplib `GetMessage` (from `channel.get`) into a `ReceivedMessage` with `ack`/`nack` methods.
 * Parses the message content as JSON; falls back to raw string if parsing fails.
 * @param channel - The amqplib channel for acknowledging/rejecting the message.
 * @param msg - The raw `GetMessage` from `channel.get`.
 * @returns A `ReceivedMessage` with parsed body, metadata, and ack/nack methods.
 */
export const createReceivedMessageFromGet = <T>(
  channel: Channel,
  msg: GetMessage,
): ReceivedMessage<T> => {
  let body: T
  try {
    body = JSON.parse(msg.content.toString()) as T
  } catch {
    body = msg.content.toString() as unknown as T
  }

  return {
    id: msg.properties.messageId ?? msg.fields.deliveryTag.toString(),
    body,
    receiptHandle: msg.fields.deliveryTag.toString(),
    attributes: msg.properties.headers as Record<string, string | number | boolean> | undefined,
    receiveCount: (msg.properties.headers?.['x-death']?.[0]?.count as number) ?? 1,
    sentTimestamp: msg.properties.timestamp ? new Date(msg.properties.timestamp) : undefined,

    async ack(): Promise<void> {
      channel.ack(msg)
    },

    async nack(): Promise<void> {
      channel.nack(msg, false, true)
    },
  }
}

/**
 * Wraps an amqplib `ConsumeMessage` (from `channel.consume`) into a `ReceivedMessage` with `ack`/`nack` methods.
 * Parses the message content as JSON; falls back to raw string if parsing fails.
 * @param channel - The amqplib channel for acknowledging/rejecting the message.
 * @param msg - The raw `ConsumeMessage` from `channel.consume`.
 * @returns A `ReceivedMessage` with parsed body, metadata, and ack/nack methods.
 */
export const createReceivedMessage = <T>(
  channel: Channel,
  msg: ConsumeMessage,
): ReceivedMessage<T> => {
  let body: T
  try {
    body = JSON.parse(msg.content.toString()) as T
  } catch {
    body = msg.content.toString() as unknown as T
  }

  return {
    id: msg.properties.messageId ?? msg.fields.deliveryTag.toString(),
    body,
    receiptHandle: msg.fields.deliveryTag.toString(),
    attributes: msg.properties.headers as Record<string, string | number | boolean> | undefined,
    receiveCount: (msg.properties.headers?.['x-death']?.[0]?.count as number) ?? 1,
    sentTimestamp: msg.properties.timestamp ? new Date(msg.properties.timestamp) : undefined,

    async ack(): Promise<void> {
      channel.ack(msg)
    },

    async nack(): Promise<void> {
      channel.nack(msg, false, true)
    },
  }
}
