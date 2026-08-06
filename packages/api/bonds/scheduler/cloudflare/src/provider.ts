/**
 * Cloudflare Workers scheduler provider — the platform owns the clock.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import type { ScheduledTask, SchedulerProvider, TaskStatus } from '@molecule/api-scheduler'

import type { CloudflareSchedulerOptions } from './types.js'

interface TaskEntry {
  task: ScheduledTask
  lastRunAt: string | null
  isRunning: boolean
  lastError: string | null
  durationMs: number | null
  totalRuns: number
  totalFailures: number
  lastSuccessAt: string | null
}

/**
 * A scheduler provider whose tasks are driven by Cloudflare Cron Triggers
 * rather than by an in-process timer.
 *
 * `start()` and `stop()` gate whether {@link CloudflareScheduler.runDueTasks}
 * will execute anything; they start no timers, because a Worker has no
 * long-lived process to hold one. Nothing runs until the Worker's `scheduled()`
 * handler calls `runDueTasks()`.
 */
export interface CloudflareScheduler extends SchedulerProvider {
  /**
   * Run the scheduled tasks. Call this from the Worker's `scheduled()` handler.
   *
   * Tasks run SEQUENTIALLY and every rejection is captured, so one failing task
   * can neither abort the sweep nor reject the caller's promise — a Cron
   * Trigger invocation that throws is retried by the platform, which would
   * re-run the tasks that had already succeeded.
   *
   * @returns The status of every task after the run.
   */
  runDueTasks(): Promise<TaskStatus[]>
}

/**
 * Creates a Cloudflare Workers scheduler provider.
 *
 * @param options - Configuration options.
 * @returns A SchedulerProvider driven by Cron Triggers.
 */
export const createProvider = (options?: CloudflareSchedulerOptions): CloudflareScheduler => {
  const respectInterval = options?.respectIntervalWithinIsolate ?? false
  const tasks = new Map<string, TaskEntry>()
  const logger = getLogger()
  let started = false

  const toStatus = (entry: TaskEntry): TaskStatus => ({
    name: entry.task.name,
    lastRunAt: entry.lastRunAt,
    // The platform decides when the next run happens, and this code cannot read
    // the Worker's cron expression. Reporting a computed time would be a guess
    // presented as fact, so this is null by design.
    nextRunAt: null,
    isRunning: entry.isRunning,
    lastError: entry.lastError,
    durationMs: entry.durationMs,
    totalRuns: entry.totalRuns,
    totalFailures: entry.totalFailures,
    lastSuccessAt: entry.lastSuccessAt,
    enabled: entry.task.enabled !== false,
  })

  const runTask = async (entry: TaskEntry): Promise<void> => {
    if (entry.isRunning) {
      logger.warn(`Scheduler task '${entry.task.name}' skipped: previous execution still running`)
      return
    }
    entry.isRunning = true
    const startTime = Date.now()
    try {
      await entry.task.handler()
      entry.lastError = null
      entry.lastSuccessAt = new Date().toISOString()
    } catch (error) {
      entry.lastError = error instanceof Error ? error.message : String(error)
      logger.error(`Scheduler task '${entry.task.name}' failed: ${entry.lastError}`)
      entry.totalFailures++
    } finally {
      entry.isRunning = false
      entry.durationMs = Date.now() - startTime
      entry.totalRuns++
      entry.lastRunAt = new Date().toISOString()
    }
  }

  return {
    schedule(task: ScheduledTask): void {
      tasks.set(task.name, {
        task,
        lastRunAt: null,
        isRunning: false,
        lastError: null,
        durationMs: null,
        totalRuns: 0,
        totalFailures: 0,
        lastSuccessAt: null,
      })
    },

    unschedule(name: string): boolean {
      return tasks.delete(name)
    },

    getStatus(name: string): TaskStatus | null {
      const entry = tasks.get(name)
      return entry ? toStatus(entry) : null
    },

    getAllStatuses(): TaskStatus[] {
      return [...tasks.values()].map(toStatus)
    },

    start(): void {
      started = true
    },

    stop(): void {
      started = false
    },

    async runDueTasks(): Promise<TaskStatus[]> {
      if (!started) {
        // Loud: a Cron Trigger that fires into a stopped scheduler does nothing,
        // and silence here looks identical to "there was no work to do".
        logger.warn('Cloudflare scheduler: runDueTasks() called before start(); nothing ran')
        return []
      }
      const now = Date.now()
      for (const entry of tasks.values()) {
        if (entry.task.enabled === false) continue
        if (respectInterval && entry.lastRunAt) {
          if (now - new Date(entry.lastRunAt).getTime() < entry.task.intervalMs) continue
        }
        await runTask(entry)
      }
      return [...tasks.values()].map(toStatus)
    },
  }
}
