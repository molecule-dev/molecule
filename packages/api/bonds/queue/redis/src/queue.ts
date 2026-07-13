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
 * Wire envelope this bond stores in `job.data`, versioned so a future shape
 * change can coexist with jobs already sitting in Redis. `attributes` and
 * `deduplicationId` are captured here so they survive the round trip through
 * `receive()`/`subscribe()` instead of being silently dropped — BullMQ's
 * `job.data` has no concept of message attributes on its own.
 */
interface QueueEnvelope<T> {
  __molecule_queue_envelope: 1
  body: T
  attributes?: Record<string, string | number | boolean>
}

const isEnvelope = (data: unknown): data is QueueEnvelope<unknown> =>
  typeof data === 'object' &&
  data !== null &&
  (data as Record<string, unknown>).__molecule_queue_envelope === 1

/** Matches ioredis errors that mean "Redis is unreachable" (vs. a genuine application-level failure). */
const CONNECTION_ERROR_PATTERN =
  /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|enableOfflineQueue|max retries per request|Connection is closed|Stream isn't writeable/i

/**
 * Runs a BullMQ operation and, if it fails with a connection-level error (Redis
 * unreachable), rethrows with an actionable message naming the env vars to check —
 * instead of letting ioredis's raw (and often opaque) error surface unexplained.
 * @param queueName - The queue name, included in the wrapped error for context.
 * @param operation - The async BullMQ call to run.
 * @returns The operation's resolved value.
 */
const withConnectionErrorContext = async <T>(
  queueName: string,
  operation: () => Promise<T>,
): Promise<T> => {
  try {
    return await operation()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (CONNECTION_ERROR_PATTERN.test(message)) {
      throw new Error(
        `Redis queue "${queueName}" is unreachable — check REDIS_URL (or REDIS_HOST/REDIS_PORT/REDIS_PASSWORD).`,
        { cause: error },
      )
    }
    throw error
  }
}

/**
 * Creates a `Queue` backed by BullMQ (Redis). Supports send/sendBatch (with delay and exponential backoff retries),
 * receive (polling waiting jobs), subscribe (via BullMQ `Worker`), size, and purge.
 * @param connections - Connection options for the producer (send/receive/size/purge — configured to
 *   fail fast instead of buffering commands forever against an unreachable Redis) and the worker
 *   (subscribe — BullMQ requires `maxRetriesPerRequest: null` on this one, so it keeps ioredis's
 *   default indefinite-retry behavior, appropriate for a long-running background consumer).
 * @param queueName - The queue name used as the BullMQ queue identifier.
 * @param prefix - The Redis key prefix for all queue-related keys (default: `'molecule:queue:'`).
 * @param registerCleanup - Optional callback receiving a disposer that closes this queue's BullMQ queue and workers; the provider collects these so `provider.close()` (and `deleteQueue()`) actually release the Redis connections.
 * @returns A `Queue` object with send/receive/subscribe/size/purge methods.
 */
export const createQueue = (
  connections: { producer: ConnectionOptions; worker: ConnectionOptions },
  queueName: string,
  prefix: string,
  registerCleanup?: (cleanup: () => Promise<void>) => void,
): Queue => {
  const bullQueue = new BullQueue(queueName, {
    connection: connections.producer,
    prefix,
  })

  const workers: Map<string, Worker> = new Map()

  registerCleanup?.(async () => {
    for (const worker of workers.values()) {
      await worker.close()
    }
    workers.clear()
    await bullQueue.close()
  })

  return {
    name: queueName,

    async send<T = unknown>(message: QueueMessage<T>): Promise<string> {
      // A stable `deduplicationId` (without an explicit `id`) rides on
      // BullMQ's native "adding a job with an existing jobId is a no-op"
      // mechanism — the closest real equivalent to SQS FIFO deduplication
      // this backend has.
      const id = message.id ?? message.deduplicationId ?? crypto.randomUUID()

      const envelope: QueueEnvelope<T> = {
        __molecule_queue_envelope: 1,
        body: message.body,
        attributes: message.attributes,
      }

      const job = await withConnectionErrorContext(queueName, () =>
        bullQueue.add('message', envelope, {
          jobId: id,
          delay: message.delaySeconds ? message.delaySeconds * 1000 : undefined,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        }),
      )

      return job.id ?? id
    },

    async sendBatch<T = unknown>(messages: QueueMessage<T>[]): Promise<string[]> {
      const jobs = messages.map((message) => {
        const id = message.id ?? message.deduplicationId ?? crypto.randomUUID()
        const envelope: QueueEnvelope<T> = {
          __molecule_queue_envelope: 1,
          body: message.body,
          attributes: message.attributes,
        }
        return {
          name: 'message',
          data: envelope,
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

      const addedJobs = await withConnectionErrorContext(queueName, () => bullQueue.addBulk(jobs))
      return addedJobs.map((job) => job.id ?? '')
    },

    async receive<T = unknown>(options?: ReceiveOptions): Promise<ReceivedMessage<T>[]> {
      if (options?.visibilityTimeout) {
        logger.warn(
          `Redis queue "${queueName}".receive({ visibilityTimeout }) has no effect — receive() is a PEEK (getJobs('waiting')), not a lease. The job is not locked, so a concurrently running subscribe() worker can pick up and process the same job. Use subscribe() for real single-consumer delivery.`,
        )
      }

      // BullMQ doesn't have a direct "receive" like SQS
      // We get jobs that are waiting
      const maxMessages = options?.maxMessages ?? 10
      const waitingJobs = await withConnectionErrorContext(queueName, () =>
        bullQueue.getJobs(['waiting'], 0, maxMessages - 1),
      )

      return waitingJobs.map((job) => createReceivedMessage<T>(job))
    },

    subscribe<T = unknown>(handler: MessageHandler<T>, options?: ReceiveOptions): () => void {
      const workerId = crypto.randomUUID()

      const worker = new Worker<T>(
        queueName,
        async (job) => {
          const receivedMessage = createReceivedMessage<T>(job)
          let rejected = false
          receivedMessage.ack = async () => {
            // Intentional no-op: inside a Worker processor the job is LOCKED,
            // so the default ack (`job.remove()`) throws "could not be removed
            // because it is locked by another worker" — which fails the job
            // and re-runs it. BullMQ acks by the processor returning normally.
          }
          receivedMessage.nack = async () => {
            // Defer to a post-handler throw so BullMQ's own retry/backoff
            // (attempts: 3, exponential) handles the redelivery — calling
            // `moveToFailed` mid-processing corrupts the worker's lock state.
            rejected = true
          }
          await handler(receivedMessage)
          if (rejected) {
            throw new Error(`Message ${job.id} rejected via nack() — requeueing for retry`)
          }
        },
        {
          connection: connections.worker,
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
      const counts = await withConnectionErrorContext(queueName, () =>
        bullQueue.getJobCounts('waiting', 'active', 'delayed'),
      )
      return counts.waiting + counts.active + counts.delayed
    },

    async purge(): Promise<void> {
      await withConnectionErrorContext(queueName, () => bullQueue.drain())
    },
  }
}

/**
 * Wraps a BullMQ `Job` into a `ReceivedMessage` with `ack` (removes the job) and `nack`
 * (fails the job so BullMQ retries it) methods. In the `subscribe()` worker path these are
 * overridden: there the job is locked, completion acks, and `nack()` triggers a retry throw.
 *
 * Unwraps this bond's versioned envelope (see `QueueEnvelope`) so `attributes` sent via
 * `send()` round-trip correctly; a job whose `data` predates the envelope (already in the
 * queue when this version deployed) is treated as a raw body with no attributes, exactly
 * matching the previous behavior — never `job.opts`, which are BullMQ's own retry/backoff
 * settings, not caller-supplied attributes.
 * @param job - The BullMQ job to wrap.
 * @returns A `ReceivedMessage` with the job's data, metadata, and acknowledgement methods.
 */
export const createReceivedMessage = <T>(job: Job<unknown>): ReceivedMessage<T> => {
  const raw = job.data
  const envelope = isEnvelope(raw) ? raw : null

  return {
    id: job.id ?? '',
    body: (envelope ? envelope.body : raw) as T,
    receiptHandle: job.id ?? '',
    attributes: envelope?.attributes,
    receiveCount: job.attemptsMade + 1,
    sentTimestamp: job.timestamp ? new Date(job.timestamp) : undefined,

    async ack(): Promise<void> {
      // In BullMQ, jobs are auto-acked when the processor completes
      // For manual ack, we need to remove the job
      await job.remove()
    },

    async nack(): Promise<void> {
      if (job.token) {
        await job.moveToFailed(new Error('Message rejected'), job.token)
      } else {
        // A job pulled via `receive()` (getJobs 'waiting') holds no lock: it
        // was never removed from the waiting list, so "return it to the
        // queue" is already true. `moveToFailed` without a real lock token
        // throws a cryptic "Missing lock" error — a documented no-op is the
        // correct settlement here.
        logger.debug(`BullMQ nack: job ${job.id} holds no lock (still waiting) — nothing to return`)
      }
    },
  }
}
