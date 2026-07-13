/**
 * node-cron implementation of CronProvider.
 *
 * Uses the `node-cron` library for in-process cron scheduling. Jobs run in the
 * current Node.js process and are lost on restart. For persistent jobs, use the
 * BullMQ provider instead.
 *
 * @module
 */

import cron from 'node-cron'

import type { CronJob, CronOptions, CronProvider } from '@molecule/api-cron'
import { logger } from '@molecule/api-logger'

import type { NodeCronConfig } from './types.js'

/**
 * Internal job record.
 */
interface JobRecord {
  /** Unique job identifier. */
  id: string
  /** Human-readable job name. */
  name: string
  /** Cron expression. */
  cronExpression: string
  /** The node-cron scheduled task. */
  task: cron.ScheduledTask
  /** The handler function. */
  handler: () => Promise<void>
  /** Current status. */
  status: CronJob['status']
  /** Timestamp of the last execution. */
  lastRun?: Date
  /** Total number of executions. */
  runCount: number
  /** Maximum number of executions, mirrored from the schedule options so `runNow` can enforce it too. */
  maxRuns?: number
}

/**
 * Creates a node-cron provider.
 *
 * @param config - Provider configuration.
 * @returns A `CronProvider` backed by node-cron.
 */
export const createProvider = (config: NodeCronConfig = {}): CronProvider => {
  const jobs = new Map<string, JobRecord>()

  return {
    async schedule(
      name: string,
      cronExpression: string,
      handler: () => Promise<void>,
      options?: CronOptions,
    ): Promise<string> {
      // Pre-validate: node-cron 4 throws OPAQUE errors on a malformed expression
      // (`TypeError: Cannot read properties of undefined (reading 'replace')`,
      // `RangeError: Invalid time value`) with no mention of cron or the input —
      // indistinguishable from a bug in this package. Fail with the job name and
      // the offending expression so the caller fixes the expression, not the bond.
      if (!cron.validate(cronExpression)) {
        throw new Error(
          `Invalid cron expression for job '${name}': "${cronExpression}". ` +
            `Expected 5 or 6 space-separated fields (e.g. '0 3 * * *' or '*/10 * * * * *').`,
        )
      }

      const timezone = options?.timezone ?? config.timezone

      const record: JobRecord = {
        id: '',
        name,
        cronExpression,
        handler,
        status: 'active',
        runCount: 0,
        maxRuns: options?.maxRuns,
        task: null as unknown as cron.ScheduledTask,
      }

      const task = cron.schedule(
        cronExpression,
        async () => {
          if (record.status !== 'active') {
            return
          }

          if (options?.startDate) {
            const start =
              options.startDate instanceof Date ? options.startDate : new Date(options.startDate)
            if (new Date() < start) {
              return
            }
          }

          if (options?.endDate) {
            const end =
              options.endDate instanceof Date ? options.endDate : new Date(options.endDate)
            if (new Date() > end) {
              record.status = 'completed'
              task.stop()
              return
            }
          }

          record.runCount += 1
          record.lastRun = new Date()

          try {
            await handler()
          } catch (error) {
            // A throwing handler must NOT cancel the schedule. Real cron systems
            // (crontab, BullMQ repeatables — including this category's BullMQ bond —
            // k8s CronJob) keep firing on the next tick; permanently killing the job
            // on the FIRST error turned any transient failure (a network blip in a
            // nightly cleanup) into "my cron silently stopped running" — with only a
            // warn-level log as the trace. Log it loudly and keep the job active.
            logger.error('Cron job handler threw — job stays scheduled for its next tick', {
              error,
              jobId: record.id,
              name: record.name,
            })
          }

          if (options?.maxRuns !== undefined && record.runCount >= options.maxRuns) {
            record.status = 'completed'
            task.stop()
          }
        },
        {
          timezone,
          name,
          maxExecutions: options?.maxRuns,
          // node-cron 4 natively skips a tick while the previous execution's
          // promise is still pending (and logs a warning) — no bookkeeping
          // needed on our side. Defaults to false (current behavior) when
          // omitted, matching the core CronOptions default.
          noOverlap: options?.noOverlap,
        },
      )

      record.id = task.id
      record.task = task

      if (options?.runOnInit) {
        await task.execute()
      }

      jobs.set(record.id, record)
      return record.id
    },

    async cancel(jobId: string): Promise<void> {
      const record = jobs.get(jobId)
      if (!record) {
        throw new Error(`Cron job not found: ${jobId}`)
      }
      record.task.destroy()
      jobs.delete(jobId)
    },

    async list(): Promise<CronJob[]> {
      return Array.from(jobs.values()).map((record) => ({
        id: record.id,
        name: record.name,
        cron: record.cronExpression,
        status: record.status,
        lastRun: record.lastRun,
        nextRun: record.task.getNextRun() ?? undefined,
        runCount: record.runCount,
      }))
    },

    async pause(jobId: string): Promise<void> {
      const record = jobs.get(jobId)
      if (!record) {
        throw new Error(`Cron job not found: ${jobId}`)
      }
      record.task.stop()
      record.status = 'paused'
    },

    async resume(jobId: string): Promise<void> {
      const record = jobs.get(jobId)
      if (!record) {
        throw new Error(`Cron job not found: ${jobId}`)
      }
      record.task.start()
      record.status = 'active'
    },

    async runNow(jobId: string): Promise<void> {
      const record = jobs.get(jobId)
      if (!record) {
        throw new Error(`Cron job not found: ${jobId}`)
      }
      record.runCount += 1
      record.lastRun = new Date()
      await record.handler()

      // Manual runs count toward maxRuns too — without this, runNow() could
      // push a capped job's total executions past maxRuns before the next
      // scheduled tick finally catches up and marks it 'completed'.
      if (record.maxRuns !== undefined && record.runCount >= record.maxRuns) {
        record.status = 'completed'
        record.task.stop()
      }
    },

    async close(): Promise<void> {
      // Stop every scheduled task so no timers keep the process alive.
      for (const record of jobs.values()) {
        record.task.stop()
      }
      jobs.clear()
    },
  }
}

/**
 * The provider implementation with default configuration.
 */
export const provider: CronProvider = createProvider()
