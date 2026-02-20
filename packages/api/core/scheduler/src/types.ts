/**
 * Type definitions for the scheduler core interface.
 * @module
 */

/**
 * A scheduled task definition.
 */
export interface ScheduledTask {
  /** Unique identifier for this task. */
  name: string
  /** Interval in milliseconds between executions. */
  intervalMs: number
  /** Async function to execute on each tick. */
  handler(): Promise<void>
  /** Whether this task is enabled. Defaults to true. */
  enabled?: boolean
}

/**
 * Runtime status of a scheduled task.
 */
export interface TaskStatus {
  /** Task name. */
  name: string
  /** ISO 8601 timestamp of the last execution, or null if not yet run. */
  lastRunAt: string | null
  /** ISO 8601 timestamp of the next scheduled execution. */
  nextRunAt: string | null
  /** Whether the task is currently executing. */
  isRunning: boolean
  /** Error message from the last failed execution, if any. */
  lastError: string | null
  /** Duration in milliseconds of the last execution, or null if not yet run. */
  durationMs: number | null
  /** Total number of completed executions (both success and failure). */
  totalRuns: number
  /** Total number of failed executions. */
  totalFailures: number
  /** ISO 8601 timestamp of the last successful execution, or null. */
  lastSuccessAt: string | null
  /** Whether this task is enabled. */
  enabled: boolean
}

/**
 * Scheduler provider interface. All scheduler providers must implement this.
 */
export interface SchedulerProvider {
  /**
   * Registers and starts a scheduled task.
   * If a task with the same name already exists, it is replaced.
   *
   * @param task - The task to schedule.
   */
  schedule(task: ScheduledTask): void

  /**
   * Stops and removes a scheduled task by name.
   *
   * @param name - The task name to unschedule.
   * @returns true if found and removed, false otherwise.
   */
  unschedule(name: string): boolean

  /**
   * Returns the runtime status of a specific task.
   *
   * @param name - The task name.
   * @returns The task status, or null if not found.
   */
  getStatus(name: string): TaskStatus | null

  /**
   * Returns the runtime status of all scheduled tasks.
   */
  getAllStatuses(): TaskStatus[]

  /**
   * Starts the scheduler. Tasks begin executing according to their intervals.
   */
  start(): void

  /**
   * Stops the scheduler. All tasks stop executing. Can be restarted with start().
   */
  stop(): void
}
