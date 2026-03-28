/**
 * BullMQ implementation of CronProvider.
 *
 * Uses BullMQ repeatable jobs backed by Redis for distributed, persistent
 * cron scheduling. Jobs survive process restarts and can be distributed
 * across multiple workers.
 *
 * @module
 */

import { Queue, Worker } from 'bullmq'

import type { CronJob, CronOptions, CronProvider } from '@molecule/api-cron'

import type { BullMQCronConfig } from './types.js'

/** Default queue name. */
const DEFAULT_QUEUE_NAME = 'molecule-cron'

/**
 * Internal handler registry.
 */
interface HandlerRecord {
  /** Human-readable job name. */
  name: string
  /** Cron expression. */
  cron: string
  /** The handler function. */
  handler: () => Promise<void>
  /** Current status. */
  status: CronJob['status']
  /** Timestamp of the last execution. */
  lastRun?: Date
  /** Total number of executions. */
  runCount: number
}

/**
 * Creates a BullMQ cron provider.
 *
 * @param config - Provider configuration including Redis connection.
 * @returns A `CronProvider` backed by BullMQ repeatable jobs.
 */
export const createProvider = (config: BullMQCronConfig): CronProvider => {
  const queueName = config.queueName ?? DEFAULT_QUEUE_NAME
  const connection = {
    host: config.connection.host ?? 'localhost',
    port: config.connection.port ?? 6379,
    password: config.connection.password,
    db: config.connection.db,
  }

  const queue = new Queue(queueName, { connection })
  const handlers = new Map<string, HandlerRecord>()

  const worker = new Worker(
    queueName,
    async (job) => {
      const jobName = job.name
      const record = handlers.get(jobName)
      if (!record || record.status !== 'active') {
        return
      }

      record.runCount += 1
      record.lastRun = new Date()

      await record.handler()
    },
    { connection },
  )

  // Suppress unhandled error events
  worker.on('error', () => {})

  return {
    async schedule(
      name: string,
      cron: string,
      handler: () => Promise<void>,
      options?: CronOptions,
    ): Promise<string> {
      const timezone = options?.timezone ?? config.timezone

      const record: HandlerRecord = {
        name,
        cron,
        handler,
        status: 'active',
        runCount: 0,
      }

      const repeatOpts: Record<string, unknown> = {
        pattern: cron,
      }

      if (timezone) {
        repeatOpts['tz'] = timezone
      }
      if (options?.maxRuns !== undefined) {
        repeatOpts['limit'] = options.maxRuns
      }
      if (options?.startDate) {
        repeatOpts['startDate'] =
          options.startDate instanceof Date ? options.startDate : new Date(options.startDate)
      }
      if (options?.endDate) {
        repeatOpts['endDate'] =
          options.endDate instanceof Date ? options.endDate : new Date(options.endDate)
      }

      await queue.upsertJobScheduler(name, repeatOpts, {
        name,
        data: {},
      })

      handlers.set(name, record)

      if (options?.runOnInit) {
        record.runCount += 1
        record.lastRun = new Date()
        await handler()
      }

      return name
    },

    async cancel(jobId: string): Promise<void> {
      const record = handlers.get(jobId)
      if (!record) {
        throw new Error(`Cron job not found: ${jobId}`)
      }

      await queue.removeJobScheduler(jobId)
      handlers.delete(jobId)
    },

    async list(): Promise<CronJob[]> {
      return Array.from(handlers.entries()).map(([id, record]) => ({
        id,
        name: record.name,
        cron: record.cron,
        status: record.status,
        lastRun: record.lastRun,
        nextRun: undefined,
        runCount: record.runCount,
      }))
    },

    async pause(jobId: string): Promise<void> {
      const record = handlers.get(jobId)
      if (!record) {
        throw new Error(`Cron job not found: ${jobId}`)
      }
      record.status = 'paused'
    },

    async resume(jobId: string): Promise<void> {
      const record = handlers.get(jobId)
      if (!record) {
        throw new Error(`Cron job not found: ${jobId}`)
      }
      record.status = 'active'
    },

    async runNow(jobId: string): Promise<void> {
      const record = handlers.get(jobId)
      if (!record) {
        throw new Error(`Cron job not found: ${jobId}`)
      }
      record.runCount += 1
      record.lastRun = new Date()
      await record.handler()
    },
  }
}
