/**
 * SQS queue implementation.
 *
 * @module
 */

import {
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
        MessageDeduplicationId: message.deduplicationId ?? id,
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
          MessageDeduplicationId: message.deduplicationId ?? id,
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
        AttributeNames: ['All'],
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
            } catch (error) {
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
 * `nack` (lets the message become visible again after the visibility timeout expires) methods.
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
  } catch {
    body = msg.Body as unknown as T
  }

  const attributes = msg.MessageAttributes
    ? Object.fromEntries(
        Object.entries(msg.MessageAttributes).map(([key, value]) => [key, value.StringValue ?? '']),
      )
    : undefined

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
      const command = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: msg.ReceiptHandle,
      })
      await client.send(command)
    },

    async nack(): Promise<void> {
      // SQS doesn't have nack - message will become visible again after visibility timeout
      // We can change visibility to 0 to make it immediately visible
      // For now, just log that we're not acking
      logger.debug('SQS nack: message will become visible after visibility timeout')
    },
  }
}
