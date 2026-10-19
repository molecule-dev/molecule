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
 * Cross-instance coordination for one scheduled task run.
 *
 * The scheduler is in-process: every API instance runs its own timers, so with
 * more than one instance a task runs once per instance unless the run itself is
 * coordinated. A provider that needs "once across the platform" consults a
 * `SchedulerTaskRunLock` before invoking the handler; the winning instance runs
 * it, the others skip that tick.
 *
 * A provider bond implements this against a store every instance shares (e.g.
 * a PostgreSQL session advisory lock in
 * `@molecule/api-scheduler-postgresql`). The lock must be held for the
 * DURATION of the run — and, when the provider passes `holdMs`, for the rest
 * of that interval — so two instances ticking milliseconds apart cannot both
 * run one window. Release happens on schedule or when the connection dies;
 * never a blind TTL lease that could expire under a slow run.
 */
export interface SchedulerTaskRunLock {
  /**
   * Run `run` only when this instance wins the named lock.
   *
   * A provider that cannot reach the lock store must SKIP the run rather than
   * run uncoordinated: a skipped sweep is retried on the next tick, whereas two
   * concurrent runs can corrupt shared state.
   *
   * @param taskName - The stable task name (the same name on every instance).
   * @param run - The handler to run while the lock is held.
   * @param options - `holdMs` keeps the lock after the run finishes, so a
   * sibling instance whose timer ticks a few milliseconds later does not run
   * the SAME interval. Pass the task's `intervalMs`; the lock is released when
   * the window ends, and the instances race again for the next one.
   * @returns `true` when the handler ran on this instance, `false` when another
   * instance held the lock or the store could not be reached.
   */
  runExclusive(
    taskName: string,
    run: () => Promise<void>,
    options?: { holdMs?: number },
  ): Promise<boolean>

  /**
   * Release any connection the lock holds open.
   *
   * @returns Resolves once the connection is closed.
   */
  close?(): Promise<void>
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
   * Registers a scheduled task.
   * If a task with the same name already exists, it is replaced.
   *
   * The task does NOT execute until `start()` has been called; a task
   * scheduled while the scheduler is already running begins automatically.
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
