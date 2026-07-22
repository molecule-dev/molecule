/**
 * Default in-process scheduler provider using setInterval.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import type { ScheduledTask, SchedulerProvider, TaskStatus } from '@molecule/api-scheduler'

import type { DefaultSchedulerOptions } from './types.js'

interface TaskEntry {
  task: ScheduledTask
  timer: ReturnType<typeof setInterval> | null
  /** Pending staggered-startup timeout — tracked so stopTask can cancel it. */
  staggerTimer: ReturnType<typeof setTimeout> | null
  lastRunAt: string | null
  nextRunAt: string | null
  isRunning: boolean
  lastError: string | null
  durationMs: number | null
  totalRuns: number
  totalFailures: number
  lastSuccessAt: string | null
}

/**
 * Creates a default in-process scheduler provider.
 *
 * @param options - Configuration options.
 * @returns A SchedulerProvider implementation.
 */
export const createProvider = (options?: DefaultSchedulerOptions): SchedulerProvider => {
  const staggerMs = options?.staggerMs ?? 2000
  const tasks = new Map<string, TaskEntry>()
  const logger = getLogger()
  let started = false
  let taskIndex = 0

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
      entry.nextRunAt = new Date(Date.now() + entry.task.intervalMs).toISOString()
    }
  }

  const startTask = (entry: TaskEntry, staggerIndex: number): void => {
    if (entry.timer || entry.staggerTimer) return
    const delay = staggerIndex * staggerMs

    // The stagger timeout MUST be tracked on the entry: unschedule()/stop()/a
    // schedule() replacement during the stagger window used to leave this
    // anonymous timeout pending, and when it fired it started an interval that
    // nothing could ever stop (the entry was already removed from `tasks`, so
    // even stop() couldn't reach it) — the old task kept executing forever.
    entry.staggerTimer = setTimeout(() => {
      entry.staggerTimer = null
      if (!started) return
      runTask(entry)
      // runTask's synchronous portion runs the handler up to its first
      // await — and the handler may have unscheduled THIS task (the only
      // in-contract one-off pattern is unschedule-inside-handler), replaced
      // it via schedule(), or stop()ped the scheduler in that window. Arming
      // the interval unconditionally here leaked it: the entry was already
      // deleted from `tasks`, so nothing could ever stop the interval and
      // the "one-off" task kept firing forever.
      if (tasks.get(entry.task.name) !== entry || !started) return
      entry.timer = setInterval(() => runTask(entry), entry.task.intervalMs)
      entry.timer?.unref?.()
    }, delay)
    // unref like the interval below so pending staggers never hold the process open.
    entry.staggerTimer?.unref?.()

    entry.nextRunAt = new Date(Date.now() + delay).toISOString()
  }

  const stopTask = (entry: TaskEntry): void => {
    if (entry.staggerTimer) {
      clearTimeout(entry.staggerTimer)
      entry.staggerTimer = null
    }
    if (entry.timer) {
      clearInterval(entry.timer)
      entry.timer = null
    }
    entry.nextRunAt = null
  }

  return {
    schedule(task: ScheduledTask): void {
      const existing = tasks.get(task.name)
      if (existing) {
        stopTask(existing)
      }

      const entry: TaskEntry = {
        task,
        timer: null,
        staggerTimer: null,
        lastRunAt: null,
        nextRunAt: null,
        isRunning: false,
        lastError: null,
        durationMs: null,
        totalRuns: 0,
        totalFailures: 0,
        lastSuccessAt: null,
      }

      tasks.set(task.name, entry)

      if (started && task.enabled !== false) {
        // Cap the stagger offset at the current number of enabled tasks
        // instead of letting taskIndex grow forever across the process's
        // lifetime. Without the modulo, an app that re-schedules (replaces)
        // tasks at runtime accrues an ever-growing delay — the 30th
        // schedule() call after start() would wait a full minute (30 *
        // 2000ms default) before its first run, with only a far-future
        // nextRunAt as the clue. Bounding by the enabled-task count keeps
        // the max possible delay at (enabledCount - 1) * staggerMs, same as
        // the worst case at boot.
        const enabledCount = Math.max(
          1,
          Array.from(tasks.values()).filter((e) => e.task.enabled !== false).length,
        )
        startTask(entry, taskIndex % enabledCount)
        taskIndex++
      }
    },

    unschedule(name: string): boolean {
      const entry = tasks.get(name)
      if (!entry) return false
      stopTask(entry)
      tasks.delete(name)
      return true
    },

    getStatus(name: string): TaskStatus | null {
      const entry = tasks.get(name)
      if (!entry) return null
      return {
        name: entry.task.name,
        lastRunAt: entry.lastRunAt,
        nextRunAt: entry.nextRunAt,
        isRunning: entry.isRunning,
        lastError: entry.lastError,
        durationMs: entry.durationMs,
        totalRuns: entry.totalRuns,
        totalFailures: entry.totalFailures,
        lastSuccessAt: entry.lastSuccessAt,
        enabled: entry.task.enabled !== false,
      }
    },

    getAllStatuses(): TaskStatus[] {
      return Array.from(tasks.values()).map((entry) => ({
        name: entry.task.name,
        lastRunAt: entry.lastRunAt,
        nextRunAt: entry.nextRunAt,
        isRunning: entry.isRunning,
        lastError: entry.lastError,
        durationMs: entry.durationMs,
        totalRuns: entry.totalRuns,
        totalFailures: entry.totalFailures,
        lastSuccessAt: entry.lastSuccessAt,
        enabled: entry.task.enabled !== false,
      }))
    },

    start(): void {
      if (started) return
      started = true
      taskIndex = 0
      const enabledCount = Array.from(tasks.values()).filter((e) => e.task.enabled !== false).length
      const modulus = Math.max(1, enabledCount)
      for (const entry of tasks.values()) {
        if (entry.task.enabled !== false) {
          startTask(entry, taskIndex % modulus)
          taskIndex++
        }
      }
      logger.debug(`Scheduler started with ${enabledCount} enabled task(s)`)
    },

    stop(): void {
      started = false
      for (const entry of tasks.values()) {
        stopTask(entry)
      }
      logger.debug('Scheduler stopped')
    },
  }
}
