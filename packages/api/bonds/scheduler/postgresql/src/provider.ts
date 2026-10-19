/**
 * PostgreSQL-coordinated scheduler provider.
 *
 * In-process timers (one per instance) with a per-task session advisory lock
 * around every run: both instances tick, exactly one runs the handler, so a
 * scheduled task runs ONCE across the platform per interval.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import type {
  ScheduledTask,
  SchedulerProvider,
  SchedulerTaskRunLock,
  TaskStatus,
} from '@molecule/api-scheduler'

import { createPostgresTaskRunLock } from './lock.js'
import type { PostgresSchedulerOptions } from './types.js'

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
 * How long a winning runner keeps the task's lock after the handler finishes.
 *
 * Slightly SHORTER than the interval: the sibling instance's timer usually
 * ticks a few milliseconds after this one, so the lock must still be held then
 * — but it must be released BEFORE this instance's own next tick, or the next
 * window would be skipped every time. 10% margin, capped at 250 ms (a long
 * interval does not need a bigger guard).
 *
 * @param intervalMs - The task's interval.
 * @returns The hold window in milliseconds.
 */
function holdWindowMs(intervalMs: number): number {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) return 0
  const margin = Math.max(1, Math.min(250, Math.floor(intervalMs * 0.1)))
  return Math.max(0, intervalMs - margin)
}

/**
 * Creates a scheduler provider that runs each task once across every instance.
 *
 * @param options - Stagger, connection and lock configuration.
 * @returns A `SchedulerProvider` whose runs are coordinated by a per-task
 * PostgreSQL advisory lock.
 *
 * @example
 * ```typescript
 * import { createProvider } from '@molecule/api-scheduler-postgresql'
 * import { setProvider, schedule, start } from '@molecule/api-scheduler'
 *
 * setProvider(createProvider()) // reads DATABASE_URL lazily
 * schedule({ name: 'nightly-sweep', intervalMs: 3_600_000, handler: sweep })
 * start()
 * ```
 */
export const createProvider = (options?: PostgresSchedulerOptions): SchedulerProvider => {
  const staggerMs = options?.staggerMs ?? 2000
  /** Build the run lock; `stop()` releases it and `start()` may need a fresh one. */
  const buildLock = (): SchedulerTaskRunLock =>
    options?.lock ??
    createPostgresTaskRunLock({
      connectionString: options?.connectionString,
      lockClassId: options?.lockClassId,
      runUncoordinatedOnLockError: options?.runUncoordinatedOnLockError,
      connect: options?.connect,
    })
  let lock: SchedulerTaskRunLock = buildLock()
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
    let ran = false
    try {
      ran = await lock.runExclusive(
        entry.task.name,
        async () => {
          await entry.task.handler()
          entry.lastError = null
          entry.lastSuccessAt = new Date().toISOString()
        },
        // Hold the runner's lock for the rest of the interval: a sibling
        // instance whose timer ticks milliseconds later must not run the same
        // window the instant this one releases.
        { holdMs: holdWindowMs(entry.task.intervalMs) },
      )
    } catch (error) {
      entry.lastError = error instanceof Error ? error.message : String(error)
      logger.error(`Scheduler task '${entry.task.name}' failed: ${entry.lastError}`)
      entry.totalFailures++
    } finally {
      entry.isRunning = false
      // A tick this instance did NOT win is not a run: leave lastRunAt and the
      // counters alone so the status keeps meaning "this task ran", not "we
      // happened to tick".
      if (ran) {
        entry.durationMs = Date.now() - startTime
        entry.totalRuns++
        entry.lastRunAt = new Date().toISOString()
      }
      entry.nextRunAt = new Date(Date.now() + entry.task.intervalMs).toISOString()
    }
  }

  const startTask = (entry: TaskEntry, staggerIndex: number): void => {
    if (entry.timer || entry.staggerTimer) return
    const delay = staggerIndex * staggerMs

    // The stagger timeout MUST be tracked on the entry: unschedule()/stop()/a
    // schedule() replacement during the stagger window would otherwise leave an
    // anonymous timeout pending that starts an interval nothing can stop.
    entry.staggerTimer = setTimeout(() => {
      entry.staggerTimer = null
      if (!started) return
      void runTask(entry)
      // The handler may have unscheduled or replaced this task, or stopped the
      // scheduler, before arming the interval — re-check before arming.
      if (tasks.get(entry.task.name) !== entry || !started) return
      entry.timer = setInterval(() => void runTask(entry), entry.task.intervalMs)
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
        // Bound the stagger offset by the current enabled-task count so
        // repeatedly calling schedule() at runtime never accrues a longer and
        // longer first-run delay.
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
      return statusOf(entry)
    },

    getAllStatuses(): TaskStatus[] {
      return Array.from(tasks.values()).map(statusOf)
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
      // Release the dedicated lock connection: with the timers stopped no run
      // can need it, and the next start() opens a fresh one lazily.
      if (lock.close) void lock.close()
      lock = buildLock()
      logger.debug('Scheduler stopped')
    },
  }
}

/**
 * Render one task's runtime status.
 *
 * @param entry - The internal task entry.
 * @returns The public status shape.
 */
function statusOf(entry: TaskEntry): TaskStatus {
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
}
