/**
 * Lazy queue implementation that fetches URL on first operation.
 *
 * @module
 */

import type { SQSClient } from '@aws-sdk/client-sqs'

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
import type {
  MessageHandler,
  Queue,
  QueueMessage,
  ReceivedMessage,
  ReceiveOptions,
} from '@molecule/api-queue'

import { createQueue } from './queue.js'

/**
 * Creates a lazily-initialized SQS queue that resolves the queue URL on first operation.
 * All methods defer to a real `Queue` (created by `createQueue`) once the URL is fetched.
 * @param client - The `SQSClient` instance.
 * @param queueName - The logical queue name.
 * @param getUrl - An async function that resolves the SQS queue URL (via `GetQueueUrlCommand`).
 * @returns A `Queue` whose operations are deferred until the URL is resolved.
 */
export const createLazyQueue = (
  client: SQSClient,
  queueName: string,
  getUrl: () => Promise<string>,
): Queue => {
  let cachedQueue: Queue | null = null

  const getQueue = async (): Promise<Queue> => {
    if (!cachedQueue) {
      const url = await getUrl()
      cachedQueue = createQueue(client, queueName, url)
    }
    return cachedQueue
  }

  return {
    name: queueName,

    async send<T = unknown>(message: QueueMessage<T>): Promise<string> {
      const q = await getQueue()
      return q.send(message)
    },

    async sendBatch<T = unknown>(messages: QueueMessage<T>[]): Promise<string[]> {
      const q = await getQueue()
      return q.sendBatch!(messages)
    },

    async receive<T = unknown>(options?: ReceiveOptions): Promise<ReceivedMessage<T>[]> {
      const q = await getQueue()
      return q.receive(options)
    },

    subscribe<T = unknown>(handler: MessageHandler<T>, options?: ReceiveOptions): () => void {
      let unsubscribe: (() => void) | null = null

      getQueue()
        .then((q) => {
          unsubscribe = q.subscribe(handler, options)
        })
        .catch((error) => {
          logger.error('SQS subscribe error:', error)
        })

      return () => {
        unsubscribe?.()
      }
    },

    async size(): Promise<number> {
      const q = await getQueue()
      return q.size!()
    },

    async purge(): Promise<void> {
      const q = await getQueue()
      return q.purge!()
    },
  }
}
