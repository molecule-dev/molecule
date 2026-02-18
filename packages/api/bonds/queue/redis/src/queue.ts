/**
 * Redis/BullMQ queue implementation.
 *
 * @module
 */

import type { ConnectionOptions } from 'bullmq'
import { type Job, Queue as BullQueue, Worker } from 'bullmq'

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
 * Creates a `Queue` backed by BullMQ (Redis). Supports send/sendBatch (with delay and exponential backoff retries),
 * receive (polling waiting jobs), subscribe (via BullMQ `Worker`), size, and purge.
 * @param connection - The BullMQ/Redis connection options.
 * @param queueName - The queue name used as the BullMQ queue identifier.
 * @param prefix - The Redis key prefix for all queue-related keys (default: `'molecule:queue:'`).
 * @returns A `Queue` object with send/receive/subscribe/size/purge methods.
 */
export const createQueue = (
  connection: ConnectionOptions,
  queueName: string,
  prefix: string,
): Queue => {
  const bullQueue = new BullQueue(queueName, {
    connection,
    prefix,
  })

  const workers: Map<string, Worker> = new Map()

  return {
    name: queueName,

    async send<T = unknown>(message: QueueMessage<T>): Promise<string> {
      const id = message.id ?? crypto.randomUUID()

      const job = await bullQueue.add('message', message.body, {
        jobId: id,
        delay: message.delaySeconds ? message.delaySeconds * 1000 : undefined,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      })

      return job.id ?? id
    },

    async sendBatch<T = unknown>(messages: QueueMessage<T>[]): Promise<string[]> {
      const jobs = messages.map((message) => {
        const id = message.id ?? crypto.randomUUID()
        return {
          name: 'message',
          data: message.body,
          opts: {
            jobId: id,
            delay: message.delaySeconds ? message.delaySeconds * 1000 : undefined,
            attempts: 3,
            backoff: {
              type: 'exponential' as const,
              delay: 1000,
            },
          },
        }
      })

      const addedJobs = await bullQueue.addBulk(jobs)
      return addedJobs.map((job) => job.id ?? '')
    },

    async receive<T = unknown>(options?: ReceiveOptions): Promise<ReceivedMessage<T>[]> {
      // BullMQ doesn't have a direct "receive" like SQS
      // We get jobs that are waiting
      const maxMessages = options?.maxMessages ?? 10
      const waitingJobs = await bullQueue.getJobs(['waiting'], 0, maxMessages - 1)

      return waitingJobs.map((job) => createReceivedMessage<T>(job))
    },

    subscribe<T = unknown>(handler: MessageHandler<T>, options?: ReceiveOptions): () => void {
      const workerId = crypto.randomUUID()

      const worker = new Worker<T>(
        queueName,
        async (job) => {
          const receivedMessage = createReceivedMessage<T>(job)
          await handler(receivedMessage)
        },
        {
          connection,
          prefix,
          concurrency: options?.maxMessages ?? 1,
        },
      )

      worker.on('completed', (job) => {
        logger.debug(`BullMQ job ${job.id} completed`)
      })

      worker.on('failed', (job, error) => {
        logger.error(`BullMQ job ${job?.id} failed:`, error)
      })

      worker.on('error', (error) => {
        logger.error('BullMQ worker error:', error)
      })

      workers.set(workerId, worker)

      return () => {
        const w = workers.get(workerId)
        if (w) {
          w.close().catch((error) => {
            logger.error('BullMQ worker close error:', error)
          })
          workers.delete(workerId)
        }
      }
    },

    async size(): Promise<number> {
      const counts = await bullQueue.getJobCounts('waiting', 'active', 'delayed')
      return counts.waiting + counts.active + counts.delayed
    },

    async purge(): Promise<void> {
      await bullQueue.drain()
    },
  }
}

/**
 * Wraps a BullMQ `Job` into a `ReceivedMessage` with `ack` (removes the job) and `nack` (moves to failed) methods.
 * @param job - The BullMQ job to wrap.
 * @returns A `ReceivedMessage` with the job's data, metadata, and acknowledgement methods.
 */
export const createReceivedMessage = <T>(job: Job<T>): ReceivedMessage<T> => {
  return {
    id: job.id ?? '',
    body: job.data,
    receiptHandle: job.id ?? '',
    attributes: job.opts as unknown as Record<string, string | number | boolean>,
    receiveCount: job.attemptsMade + 1,
    sentTimestamp: job.timestamp ? new Date(job.timestamp) : undefined,

    async ack(): Promise<void> {
      // In BullMQ, jobs are auto-acked when the processor completes
      // For manual ack, we need to remove the job
      await job.remove()
    },

    async nack(): Promise<void> {
      // Move job back to waiting state
      await job.moveToFailed(new Error('Message rejected'), job.token ?? '')
    },
  }
}
