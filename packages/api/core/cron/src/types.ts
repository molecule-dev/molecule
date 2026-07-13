/**
 * Type definitions for the cron core interface.
 *
 * @module
 */

/**
 * Status of a cron job.
 */
export type CronJobStatus = 'active' | 'paused' | 'completed' | 'failed'

/**
 * Options for scheduling a cron job.
 */
export interface CronOptions {
  /** IANA timezone for the cron schedule (e.g., `'America/New_York'`). */
  timezone?: string

  /** Whether to run the job immediately on creation. Defaults to `false`. */
  runOnInit?: boolean

  /** Maximum number of times the job should run. `undefined` means unlimited. */
  maxRuns?: number

  /** Start date — the job will not run before this date. */
  startDate?: Date | string

  /** End date — the job will not run after this date. */
  endDate?: Date | string

  /**
   * When `true`, a tick that arrives while the previous execution of this
   * job is still running is skipped instead of running concurrently.
   * Defaults to `false` (current behavior: overlapping executions are
   * allowed) to avoid changing existing deployments' concurrency.
   * Support is provider-specific: node-cron enforces it natively (skips the
   * tick and logs a warning); the BullMQ bond emulates it per-process by
   * skipping a tick while a previous invocation on the same worker process
   * hasn't finished — it does NOT coordinate across multiple distributed
   * worker processes.
   */
  noOverlap?: boolean
}

/**
 * A scheduled cron job.
 */
export interface CronJob {
  /** Unique job identifier. */
  id: string

  /** Human-readable job name. */
  name: string

  /** The cron expression (e.g., `'0 * * * *'` for every hour). */
  cron: string

  /** Current job status. */
  status: CronJobStatus

  /** Timestamp of the last execution, if any. */
  lastRun?: Date

  /** Timestamp of the next scheduled execution, if any. */
  nextRun?: Date

  /** Total number of times the job has been executed. */
  runCount: number
}

/**
 * Cron provider interface.
 *
 * All cron providers must implement this interface. Bond packages
 * (node-cron, BullMQ, etc.) provide concrete implementations.
 */
export interface CronProvider {
  /**
   * Schedules a new cron job.
   *
   * @param name - Human-readable name for the job.
   * @param cron - A cron expression defining the schedule.
   * @param handler - The async function to execute on each tick.
   * @param options - Optional scheduling configuration.
   * @returns The unique job identifier.
   */
  schedule(
    name: string,
    cron: string,
    handler: () => Promise<void>,
    options?: CronOptions,
  ): Promise<string>

  /**
   * Cancels and removes a scheduled job.
   *
   * @param jobId - The job identifier.
   */
  cancel(jobId: string): Promise<void>

  /**
   * Lists all registered cron jobs.
   *
   * @returns An array of cron job descriptors.
   */
  list(): Promise<CronJob[]>

  /**
   * Pauses a running cron job without removing it.
   *
   * @param jobId - The job identifier.
   */
  pause(jobId: string): Promise<void>

  /**
   * Resumes a previously paused cron job.
   *
   * @param jobId - The job identifier.
   */
  resume(jobId: string): Promise<void>

  /**
   * Triggers immediate execution of a job regardless of its schedule.
   *
   * @param jobId - The job identifier.
   */
  runNow(jobId: string): Promise<void>

  /**
   * Releases the provider's resources (timers, queue/worker connections) so
   * the process can exit cleanly — required for graceful shutdown and tests.
   * Optional: in-process providers with no persistent resources may omit it.
   */
  close?(): Promise<void>
}

/**
 * Configuration options for cron providers.
 */
export interface CronConfig {
  /** Default timezone for all jobs. */
  timezone?: string
}
