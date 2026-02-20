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
    if (entry.timer) return
    const delay = staggerIndex * staggerMs

    setTimeout(() => {
      if (!started) return
      runTask(entry)
      entry.timer = setInterval(() => runTask(entry), entry.task.intervalMs)
      entry.timer?.unref?.()
    }, delay)

    entry.nextRunAt = new Date(Date.now() + delay).toISOString()
  }

  const stopTask = (entry: TaskEntry): void => {
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
        startTask(entry, taskIndex++)
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
      for (const entry of tasks.values()) {
        if (entry.task.enabled !== false) {
          startTask(entry, taskIndex++)
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
