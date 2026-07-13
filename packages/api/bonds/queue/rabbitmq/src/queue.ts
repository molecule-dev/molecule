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
 * A `Queue` created by this bond, extended with an internal method the
 * provider uses to recover from a reconnect. Not part of the core `Queue`
 * contract — package-private, never re-exported through the barrel.
 */
export interface RabbitMQQueue extends Queue {
  /**
   * Re-attaches every currently-active `subscribe()` consumer to the
   * channel this queue was constructed with. Called by the provider after
   * the shared channel is recreated (a dropped connection or a
   * channel-killing broker error) so in-flight subscriptions survive a
   * reconnect instead of silently going dead with no consumer ever firing
   * again.
   */
  reattachSubscribers(): Promise<void>
}

/**
 * Creates a `Queue` backed by a RabbitMQ channel. Supports send, receive (pull via `channel.get`),
 * subscribe (push via `channel.consume`), size, and purge. Messages are persisted as durable by default.
 * @param channel - The open amqplib channel to use for all queue operations. May be a live proxy that
 *   forwards to a channel recreated after a reconnect — every operation reads it fresh at call time.
 * @param queueName - The RabbitMQ queue name to operate on.
 * @returns A `Queue` (with an extra `reattachSubscribers` used by the provider) bound to the queue.
 */
export const createQueue = (channel: Channel, queueName: string): RabbitMQQueue => {
  // Split into two maps so `unsubscribe()` keeps its original race-safe
  // behavior (a consumer that hasn't finished its async setup yet has no
  // consumerTag, so cancelling it is a no-op instead of `channel.cancel('')`)
  // while still letting the provider replay `subscriptions` after a
  // reconnect, when every consumerTag from the dead channel is meaningless.
  const subscriptions: Map<string, { handler: MessageHandler<unknown>; options?: ReceiveOptions }> =
    new Map()
  const consumerTags: Map<string, string> = new Map()

  const attachConsumer = async (
    subscriberId: string,
    handler: MessageHandler<unknown>,
    options?: ReceiveOptions,
  ): Promise<void> => {
    await channel.assertQueue(queueName, { durable: true })

    if (options?.maxMessages) {
      // amqplib's prefetch is async — un-awaited, consume() could start
      // delivering before the QoS cap is applied.
      await channel.prefetch(options.maxMessages)
    }

    const { consumerTag } = await channel.consume(
      queueName,
      async (msg) => {
        if (!msg) return

        const wrapped = wrapMessage<unknown>(channel, msg)
        try {
          await handler(wrapped.received)
          // Handler success acks (matching the memory and BullMQ bonds and
          // the core @example, whose handler never calls ack()). Without
          // this, every doc-following consumer leaves messages unacked
          // forever — delivery stalls once prefetch is exhausted. A no-op
          // when the handler already acked/nacked.
          wrapped.settleOnce(() => channel.ack(msg))
        } catch (error) {
          logger.error('RabbitMQ message handler error:', error)
          // A throw = retry (core contract): requeue a first failure once;
          // a redelivered message that fails again goes to the queue's
          // dead-letter exchange (configure via createQueue) or is
          // dropped — unconditional requeue would hot-loop poison
          // messages, unconditional drop breaks "throw on transient
          // errors to retry".
          wrapped.settleOnce(() => channel.nack(msg, false, !msg.fields.redelivered))
        }
      },
      { noAck: false },
    )

    consumerTags.set(subscriberId, consumerTag)
  }

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

      await channel.assertQueue(queueName, { durable: true })

      if (message.delaySeconds && message.delaySeconds > 0) {
        // Real delayed delivery WITHOUT the rabbitmq-delayed-message-exchange
        // plugin: park the message on a dedicated per-delay "wait" queue
        // whose x-message-ttl equals the requested delay, dead-lettering it
        // back to the real queue (default exchange) once the TTL expires.
        // Every message parked on a given wait queue shares the identical
        // TTL, so FIFO order == expiry order — this sidesteps RabbitMQ's
        // well-known "TTL only expires at the head of the queue" gotcha that
        // bites a single queue holding messages with different TTLs.
        const delayMs = Math.round(message.delaySeconds * 1000)
        const waitQueueName = `${queueName}.delay.${delayMs}`

        await channel.assertQueue(waitQueueName, {
          durable: true,
          arguments: {
            'x-message-ttl': delayMs,
            'x-dead-letter-exchange': '',
            'x-dead-letter-routing-key': queueName,
          },
        })

        channel.sendToQueue(waitQueueName, content, options)
      } else {
        channel.sendToQueue(queueName, content, options)
      }

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
      const record = { handler: handler as MessageHandler<unknown>, options }
      subscriptions.set(subscriberId, record)

      attachConsumer(subscriberId, record.handler, options).catch((error) => {
        logger.error('RabbitMQ subscribe error:', error)
      })

      return () => {
        subscriptions.delete(subscriberId)
        const consumerTag = consumerTags.get(subscriberId)
        if (consumerTag) {
          channel.cancel(consumerTag).catch((error) => {
            logger.error('RabbitMQ unsubscribe error:', error)
          })
          consumerTags.delete(subscriberId)
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

    async reattachSubscribers(): Promise<void> {
      consumerTags.clear()
      for (const [subscriberId, { handler, options }] of subscriptions) {
        try {
          await attachConsumer(subscriberId, handler, options)
        } catch (error) {
          logger.error(`RabbitMQ re-subscribe error for queue "${queueName}":`, error)
        }
      }
    },
  }
}

/**
 * Internal wrapper shared by the pull (`channel.get`) and push
 * (`channel.consume`) paths: builds the `ReceivedMessage` and guards
 * acknowledgement behind a settle-once latch. RabbitMQ closes the ENTIRE
 * channel (`PRECONDITION_FAILED — unknown delivery tag`) on a second
 * ack/nack for the same delivery, killing every queue sharing it — so a
 * double `ack()`, an `ack()` after `nack()`, or the subscriber auto-ack
 * racing a handler's own ack must all collapse to a single settlement.
 *
 * @param channel - The amqplib channel for acknowledging/rejecting the message.
 * @param msg - The raw message from `channel.get` or `channel.consume`.
 * @returns The wrapped message plus a `settleOnce` used by `subscribe`'s auto-ack/nack.
 */
const wrapMessage = <T>(
  channel: Channel,
  msg: GetMessage | ConsumeMessage,
): { received: ReceivedMessage<T>; settleOnce: (settle: () => void) => boolean } => {
  let body: T
  try {
    body = JSON.parse(msg.content.toString()) as T
  } catch (_error) {
    // JSON parse failure is expected for non-JSON payloads; fall back to raw string body.
    body = msg.content.toString() as unknown as T
  }

  let settled = false
  const settleOnce = (settle: () => void): boolean => {
    if (settled) return false
    settled = true
    settle()
    return true
  }

  const received: ReceivedMessage<T> = {
    id: msg.properties.messageId ?? msg.fields.deliveryTag.toString(),
    body,
    receiptHandle: msg.fields.deliveryTag.toString(),
    attributes: msg.properties.headers as Record<string, string | number | boolean> | undefined,
    receiveCount: (msg.properties.headers?.['x-death']?.[0]?.count as number) ?? 1,
    // AMQP 0-9-1 `timestamp` is POSIX SECONDS by convention — convert to ms.
    sentTimestamp: msg.properties.timestamp ? new Date(msg.properties.timestamp * 1000) : undefined,

    async ack(): Promise<void> {
      settleOnce(() => channel.ack(msg))
    },

    async nack(): Promise<void> {
      settleOnce(() => channel.nack(msg, false, true))
    },
  }

  return { received, settleOnce }
}

/**
 * Wraps an amqplib `GetMessage` (from `channel.get`) into a `ReceivedMessage` with `ack`/`nack` methods.
 * Parses the message content as JSON; falls back to raw string if parsing fails.
 * `ack()`/`nack()` are idempotent: only the first settlement is sent to the broker
 * (a repeated acknowledgement of the same delivery tag would close the channel).
 * @param channel - The amqplib channel for acknowledging/rejecting the message.
 * @param msg - The raw `GetMessage` from `channel.get`.
 * @returns A `ReceivedMessage` with parsed body, metadata, and ack/nack methods.
 */
export const createReceivedMessageFromGet = <T>(
  channel: Channel,
  msg: GetMessage,
): ReceivedMessage<T> => {
  return wrapMessage<T>(channel, msg).received
}

/**
 * Wraps an amqplib `ConsumeMessage` (from `channel.consume`) into a `ReceivedMessage` with `ack`/`nack` methods.
 * Parses the message content as JSON; falls back to raw string if parsing fails.
 * `ack()`/`nack()` are idempotent: only the first settlement is sent to the broker
 * (a repeated acknowledgement of the same delivery tag would close the channel).
 * @param channel - The amqplib channel for acknowledging/rejecting the message.
 * @param msg - The raw `ConsumeMessage` from `channel.consume`.
 * @returns A `ReceivedMessage` with parsed body, metadata, and ack/nack methods.
 */
export const createReceivedMessage = <T>(
  channel: Channel,
  msg: ConsumeMessage,
): ReceivedMessage<T> => {
  return wrapMessage<T>(channel, msg).received
}
