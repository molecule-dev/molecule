/**
 * Type definitions for the Cloudflare Workers scheduler provider.
 *
 * @module
 */

/**
 * Options for the Cloudflare Workers scheduler provider.
 */
export interface CloudflareSchedulerOptions {
  /**
   * Honour each task's `intervalMs` as a floor, using an in-isolate record of
   * when it last ran.
   *
   * Defaults to `false`, and false is almost always what you want. A Worker
   * isolate is short-lived and there may be many of them, so "when did this last
   * run" is NOT reliably known — a task skipped on that basis may simply never
   * run. With the default, every Cron Trigger runs every enabled task and the
   * trigger schedule IS the schedule, which is the only interpretation the
   * platform can actually guarantee.
   *
   * Set this to `true` only when a duplicate run is more expensive than a missed
   * one, and even then treat it as best-effort.
   */
  respectIntervalWithinIsolate?: boolean
}
