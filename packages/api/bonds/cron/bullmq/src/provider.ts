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

import { getLogger } from '@molecule/api-bond'
import type { CronJob, CronOptions, CronProvider } from '@molecule/api-cron'

import type { BullMQCronConfig } from './types.js'

const logger = getLogger()

/** Default queue name. */
const DEFAULT_QUEUE_NAME = 'molecule-cron'

/**
 * Redis key holding the paused flag for a job. Presence of the key means
 * paused — checked by EVERY worker process on EVERY tick so pause()/resume()
 * are visible cluster-wide, not just to the process that called them.
 */
const pauseKey = (queueName: string, jobId: string): string => `${queueName}:cron-paused:${jobId}`

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
  /**
   * Emulates `CronOptions.noOverlap` per-process: when `true`, a tick that
   * arrives while this job's previous invocation on THIS worker process is
   * still running is skipped. Does NOT coordinate across multiple
   * distributed worker processes — see this module's remarks in index.ts.
   */
  noOverlap: boolean
  /** `true` while a run of this job is in flight on this worker process. */
  running: boolean
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

  // Both the queue and the worker hold their own Redis connection and emit
  // their own 'error' events (e.g. ECONNREFUSED while Redis is down) — an
  // unhandled 'error' event crashes the process, so both MUST be listened
  // to. Log loudly and by name (host:port) so a stuck `schedule()` await
  // (ioredis retries connection commands indefinitely by default) reads as
  // "Redis unreachable" instead of a silent, indistinguishable hang.
  const redisTarget = `${connection.host}:${connection.port}`
  const handleConnectionError =
    (source: 'worker' | 'queue') =>
    (error: Error): void => {
      logger.error(
        `BullMQ cron ${source} error — Redis unreachable at ${redisTarget}? Cron jobs will not run until Redis is reachable.`,
        { error },
      )
      config.onError?.(error)
    }

  const worker = new Worker(
    queueName,
    async (job) => {
      const jobName = job.name
      const record = handlers.get(jobName)
      if (!record) {
        // The in-memory handler map is per-process. After a restart the
        // repeatable job scheduler in Redis keeps ticking, but nothing has
        // re-registered a handler for it yet — warn instead of silently
        // no-op-ing so this doesn't read as "cron jobs mysteriously stopped
        // running." Call schedule() for every job on every boot to fix.
        logger.warn(
          `BullMQ cron job '${jobName}' ticked but has no registered handler in this process — ` +
            `call schedule('${jobName}', ...) again on every boot to re-attach it after a restart.`,
        )
        return
      }
      // pause()/resume() are cluster-wide — a `record.status` local check
      // alone only catches THIS process's own pause() calls. Consult the
      // Redis flag every tick so a pause issued on a different worker
      // process is honored here too (the trap this fixes: other workers
      // kept executing a 'paused' job because the flag was process-local).
      const client = await queue.client
      const paused = await client.get(pauseKey(queueName, jobName))
      if (paused) {
        record.status = 'paused'
        return
      }
      if (record.status !== 'active') {
        return
      }

      if (record.noOverlap && record.running) {
        logger.warn(
          `BullMQ cron job '${jobName}' skipped: previous execution still running on this worker (noOverlap)`,
        )
        return
      }

      record.running = true
      record.runCount += 1
      record.lastRun = new Date()

      try {
        await record.handler()
      } catch (error) {
        // Never swallow a job error: log it AND rethrow so BullMQ marks this
        // occurrence 'failed' (the job failure state) — the repeatable
        // scheduler still produces the next occurrence, same keep-running
        // semantics as the node-cron bond and real crontab.
        logger.error(`Cron job handler threw for '${jobName}' — job marked failed`, {
          error,
          jobId: jobName,
        })
        throw error
      } finally {
        record.running = false
      }
    },
    { connection },
  )

  worker.on('error', handleConnectionError('worker'))
  queue.on('error', handleConnectionError('queue'))

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
        noOverlap: options?.noOverlap ?? false,
        running: false,
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
        record.running = true
        try {
          await handler()
        } catch (error) {
          logger.error(`Cron job handler threw for '${name}' during runOnInit`, {
            error,
            jobId: name,
          })
          throw error
        } finally {
          record.running = false
        }
      }

      return name
    },

    async cancel(jobId: string): Promise<void> {
      const record = handlers.get(jobId)

      // Fall through to Redis even when the in-memory record is missing —
      // after a restart the record is gone but the repeatable job scheduler
      // is still live in Redis, and this must be able to remove it. Only
      // throw 'not found' when NEITHER side knows about the job.
      const removed = await queue.removeJobScheduler(jobId)
      if (!record && !removed) {
        throw new Error(`Cron job not found: ${jobId}`)
      }

      // Clear any pause flag too — job names are reused as ids, so a
      // dangling flag would otherwise make a future schedule() call under
      // the same name start silently paused.
      const client = await queue.client
      await client.del(pauseKey(queueName, jobId))

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
      // Written to Redis (not just the local record) so every worker
      // process sharing this queue skips the job's ticks, not only this one.
      const client = await queue.client
      await client.set(pauseKey(queueName, jobId), '1')
    },

    async resume(jobId: string): Promise<void> {
      const record = handlers.get(jobId)
      if (!record) {
        throw new Error(`Cron job not found: ${jobId}`)
      }
      record.status = 'active'
      const client = await queue.client
      await client.del(pauseKey(queueName, jobId))
    },

    async runNow(jobId: string): Promise<void> {
      const record = handlers.get(jobId)
      if (!record) {
        throw new Error(`Cron job not found: ${jobId}`)
      }
      record.runCount += 1
      record.lastRun = new Date()
      try {
        await record.handler()
      } catch (error) {
        logger.error(`Cron job handler threw for '${jobId}' during runNow`, {
          error,
          jobId,
        })
        throw error
      }
    },

    async close(): Promise<void> {
      // Close the worker first so no job starts mid-shutdown, then the queue —
      // both hold Redis connections that otherwise keep the process alive.
      await worker.close()
      await queue.close()
    },
  }
}
