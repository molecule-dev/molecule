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

const RECONNECT_INITIAL_DELAY_MS = 1000
const RECONNECT_MAX_DELAY_MS = 30000

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
      let cancelled = false
      let attempt = 0

      // Resolving the queue URL failing (RABBITMQ_URL-equivalent: a bad
      // region/credentials, or a QueueDoesNotExist race) previously logged
      // once and left subscribe() permanently dead with no consumer ever
      // running again. Retry with bounded backoff instead — self-heals once
      // the queue/credentials become valid, e.g. after `createQueue()` runs
      // moments later or AWS credentials finish propagating.
      const trySubscribe = (): void => {
        if (cancelled) return
        getQueue()
          .then((q) => {
            if (cancelled) return
            unsubscribe = q.subscribe(handler, options)
          })
          .catch((error) => {
            logger.error(`SQS subscribe error (queue "${queueName}") — retrying:`, error)
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
