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
      const timezone = options?.timezone ?? config.timezone

      const record: JobRecord = {
        id: '',
        name,
        cronExpression,
        handler,
        status: 'active',
        runCount: 0,
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
          } catch {
            record.status = 'failed'
            task.stop()
            return
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
    },
  }
}

/**
 * The provider implementation with default configuration.
 */
export const provider: CronProvider = createProvider()
