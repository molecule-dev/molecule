/**
 * Type definitions for the default in-process scheduler provider.
 * @module
 */

/**
 * Configuration options for the default scheduler provider.
 */
export interface DefaultSchedulerOptions {
  /**
   * Stagger offset in milliseconds between task starts to prevent
   * thundering herd. Defaults to 2000.
   *
   * Each task's actual delay is `(index % currentEnabledTaskCount) * staggerMs`
   * — the index wraps at the current number of enabled tasks rather than
   * growing forever, so repeatedly calling `schedule()` at runtime (e.g. to
   * replace a task) never accrues an ever-larger startup delay. The worst
   * case is always `(enabledTaskCount - 1) * staggerMs`, whether the tasks
   * were all registered before `start()` or scheduled one at a time
   * afterward.
   */
  staggerMs?: number
}
