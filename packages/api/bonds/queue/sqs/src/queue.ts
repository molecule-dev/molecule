/**
 * SQS queue implementation.
 *
 * @module
 */

import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  PurgeQueueCommand,
  ReceiveMessageCommand,
  SendMessageBatchCommand,
  SendMessageCommand,
  type SQSClient,
} from '@aws-sdk/client-sqs'

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
 * Creates a `Queue` backed by AWS SQS. Supports send/sendBatch (with message attributes, delay, FIFO grouping),
 * receive (short/long polling), subscribe (continuous long-polling loop), size (approximate), and purge.
 * @param client - The initialized `SQSClient` instance.
 * @param queueName - A logical name for the queue (used in the `name` property).
 * @param queueUrl - The full SQS queue URL used for all API calls.
 * @returns A `Queue` object with send/receive/subscribe/size/purge methods bound to the SQS queue.
 */
export const createQueue = (client: SQSClient, queueName: string, queueUrl: string): Queue => {
  const subscribers: Map<string, { active: boolean }> = new Map()

  // SQS rejects MessageDeduplicationId on standard (non-FIFO) queues with
  // InvalidParameterValue, so the message-id fallback may only be applied to
  // FIFO queues (where a deduplication id is required unless content-based
  // deduplication is enabled). Explicit caller-provided ids always pass
  // through untouched.
  const isFifo = queueUrl.endsWith('.fifo')

  return {
    name: queueName,

    async send<T = unknown>(message: QueueMessage<T>): Promise<string> {
      const id = message.id ?? crypto.randomUUID()

      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(message.body),
        MessageAttributes: message.attributes
          ? Object.fromEntries(
              Object.entries(message.attributes).map(([key, value]) => [
                key,
                {
                  DataType: typeof value === 'number' ? 'Number' : 'String',
                  StringValue: String(value),
                },
              ]),
            )
          : undefined,
        DelaySeconds: message.delaySeconds,
        MessageGroupId: message.groupId,
        MessageDeduplicationId: message.deduplicationId ?? (isFifo ? id : undefined),
      })

      const result = await client.send(command)
      return result.MessageId ?? id
    },

    async sendBatch<T = unknown>(messages: QueueMessage<T>[]): Promise<string[]> {
      const entries = messages.map((message, index) => {
        const id = message.id ?? crypto.randomUUID()
        return {
          Id: String(index),
          MessageBody: JSON.stringify(message.body),
          MessageAttributes: message.attributes
            ? Object.fromEntries(
                Object.entries(message.attributes).map(([key, value]) => [
                  key,
                  {
                    DataType: typeof value === 'number' ? 'Number' : 'String',
                    StringValue: String(value),
                  },
                ]),
              )
            : undefined,
          DelaySeconds: message.delaySeconds,
          MessageGroupId: message.groupId,
          MessageDeduplicationId: message.deduplicationId ?? (isFifo ? id : undefined),
        }
      })

      // SQS batch limit is 10 messages
      const ids: string[] = []
      for (let i = 0; i < entries.length; i += 10) {
        const batch = entries.slice(i, i + 10)
        const command = new SendMessageBatchCommand({
          QueueUrl: queueUrl,
          Entries: batch,
        })
        const result = await client.send(command)
        ids.push(...(result.Successful?.map((s) => s.MessageId ?? s.Id ?? '') ?? []))
      }

      return ids
    },

    async receive<T = unknown>(options?: ReceiveOptions): Promise<ReceivedMessage<T>[]> {
      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: Math.min(options?.maxMessages ?? 10, 10), // SQS max is 10
        VisibilityTimeout: options?.visibilityTimeout,
        WaitTimeSeconds: options?.waitTimeSeconds ?? 0,
        MessageAttributeNames: ['All'],
        // `AttributeNames` is deprecated in the AWS SDK in favor of
        // `MessageSystemAttributeNames` (same values, same behavior).
        MessageSystemAttributeNames: ['All'],
      })

      const result = await client.send(command)

      return (result.Messages ?? []).map((msg) => createReceivedMessage<T>(client, queueUrl, msg))
    },

    subscribe<T = unknown>(handler: MessageHandler<T>, options?: ReceiveOptions): () => void {
      const subscriberId = crypto.randomUUID()
      subscribers.set(subscriberId, { active: true })

      const poll = async (): Promise<void> => {
        const sub = subscribers.get(subscriberId)
        if (!sub?.active) return

        try {
          const messages = await this.receive<T>({
            ...options,
            waitTimeSeconds: options?.waitTimeSeconds ?? 20, // Long polling
          })

          for (const message of messages) {
            if (!subscribers.get(subscriberId)?.active) break
            try {
              await handler(message)
              // Handler success acks (deletes) — matching the memory/BullMQ
              // bonds and the core @example, whose handler never calls ack().
              // Without this every successfully processed message reappears
              // after the visibility timeout and is re-handled forever.
              // A safe no-op when the handler already acked or nacked.
              await message.ack()
            } catch (error) {
              // A throw = retry: the un-deleted message becomes visible again
              // after the visibility timeout; the queue's redrive policy
              // (createQueue's deadLetterQueue) bounds poison messages.
              logger.error('SQS message handler error:', error)
            }
          }
        } catch (error) {
          logger.error('SQS polling error:', error)
          // Wait before retry on error
          await new Promise((resolve) => setTimeout(resolve, 5000))
        }

        // Continue polling
        if (subscribers.get(subscriberId)?.active) {
          setImmediate(poll)
        }
      }

      poll()

      return () => {
        const sub = subscribers.get(subscriberId)
        if (sub) {
          sub.active = false
        }
        subscribers.delete(subscriberId)
      }
    },

    async size(): Promise<number> {
      const command = new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ['ApproximateNumberOfMessages'],
      })
      const result = await client.send(command)
      return parseInt(result.Attributes?.ApproximateNumberOfMessages ?? '0', 10)
    },

    async purge(): Promise<void> {
      const command = new PurgeQueueCommand({
        QueueUrl: queueUrl,
      })
      await client.send(command)
    },
  }
}

/**
 * Wraps a raw SQS message into a `ReceivedMessage` with `ack` (deletes via `DeleteMessageCommand`) and
 * `nack` (returns the message to the queue immediately via `ChangeMessageVisibilityCommand` with a
 * visibility timeout of 0) methods. Both settle at most once: after an `ack()` or `nack()`, further
 * calls are safe no-ops (so the subscriber auto-ack never double-settles a handler's own ack/nack).
 * Parses the message body as JSON; falls back to raw string if parsing fails.
 * @param client - The `SQSClient` for sending ack/nack commands.
 * @param queueUrl - The SQS queue URL needed for the `DeleteMessageCommand`.
 * @param msg - The raw SQS message with `MessageId`, `Body`, `ReceiptHandle`, and optional attributes.
 * @param msg.MessageId - The unique message identifier.
 * @param msg.Body - The message body string.
 * @param msg.ReceiptHandle - The handle used for deleting or changing visibility of the message.
 * @param msg.MessageAttributes - Custom message attributes as key-value pairs.
 * @param msg.Attributes - System attributes such as receive count and sent timestamp.
 * @returns A `ReceivedMessage` with parsed body, metadata (receive count, sent timestamp), and ack/nack methods.
 */
export const createReceivedMessage = <T>(
  client: SQSClient,
  queueUrl: string,
  msg: {
    MessageId?: string
    Body?: string
    ReceiptHandle?: string
    MessageAttributes?: Record<string, { StringValue?: string }>
    Attributes?: Record<string, string>
  },
): ReceivedMessage<T> => {
  let body: T
  try {
    body = JSON.parse(msg.Body ?? '{}') as T
  } catch (_error) {
    // JSON.parse failed — body is not JSON; fall back to the raw string value
    body = msg.Body as unknown as T
  }

  const attributes = msg.MessageAttributes
    ? Object.fromEntries(
        Object.entries(msg.MessageAttributes).map(([key, value]) => [key, value.StringValue ?? '']),
      )
    : undefined

  // Settle-once latch: the first ack/nack wins; later settlements are no-ops.
  let settled = false

  return {
    id: msg.MessageId ?? '',
    body,
    receiptHandle: msg.ReceiptHandle ?? '',
    attributes,
    receiveCount: parseInt(msg.Attributes?.ApproximateReceiveCount ?? '1', 10),
    sentTimestamp: msg.Attributes?.SentTimestamp
      ? new Date(parseInt(msg.Attributes.SentTimestamp, 10))
      : undefined,

    async ack(): Promise<void> {
      if (settled) return
      settled = true
      const command = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: msg.ReceiptHandle,
      })
      await client.send(command)
    },

    async nack(): Promise<void> {
      if (settled) return
      settled = true
      // SQS has no native nack — zeroing the visibility timeout returns the
      // message to the queue immediately instead of waiting out the lease.
      const command = new ChangeMessageVisibilityCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: msg.ReceiptHandle,
        VisibilityTimeout: 0,
      })
      await client.send(command)
    },
  }
}
