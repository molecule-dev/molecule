/**
 * Provider-agnostic cron scheduling interface for molecule.dev.
 *
 * Defines the `CronProvider` interface for scheduling, pausing, resuming,
 * cancelling, and manually triggering cron jobs. Bond packages (node-cron,
 * BullMQ, etc.) implement this interface. Application code uses the convenience
 * functions (`schedule`, `cancel`, `list`, `pause`, `resume`, `runNow`, `close`)
 * which delegate to the bonded provider.
 *
 * @example
 * ```typescript
 * import { setProvider, schedule, list, close } from '@molecule/api-cron'
 * import { provider as nodeCron } from '@molecule/api-cron-node-cron'
 *
 * setProvider(nodeCron)
 *
 * const jobId = await schedule('cleanup', '0 3 * * *', async () => {
 *   console.log('Running nightly cleanup...')
 * })
 *
 * const jobs = await list()
 *
 * // On graceful shutdown / test teardown:
 * await close()
 * ```
 *
 * @remarks
 * `close()` releases the bonded provider's resources (timers, queue/worker
 * connections) and is a no-op if the provider doesn't implement it — call
 * it during shutdown instead of reaching for `getProvider().close?.()`
 * directly. `CronOptions.noOverlap` (per-job, default `false`) skips a tick
 * that arrives while the previous run of the same job is still executing;
 * support and cross-process coordination are provider-specific — see each
 * bond's module docs.
 *
 * @e2e
 * Integration checklist — drive the real flow (no mocks), adapt each item to
 * this app's actual scheduled jobs, and check every box off one by one. A box
 * you can't check is an integration bug to fix — not a skip:
 * - [ ] Every job the app defines is REGISTERED at startup: after bootstrap,
 *   `list()` returns each one (or its `schedule()` call ran without error) — a
 *   job that never registers never fires.
 * - [ ] Each job's REAL side effect happens when it runs — the digest row is
 *   written, the cleanup deletes, the report is generated. Trigger it now with
 *   `runNow(jobId)` (or invoke the handler directly) and assert the effect;
 *   never stub the body. COUNTERPARTY: the sandbox process is short-lived, so a
 *   real timed tick may never arrive — that is expected. Verify by direct
 *   invocation, not by waiting minutes for the schedule to fire.
 * - [ ] Re-running a job is safe: invoke it twice and confirm no double effect
 *   (no double-charge, double-send, or duplicate row) — the handler is
 *   idempotent or guards its own re-entry.
 * - [ ] A failing job is observable, not swallowed: force the handler to throw
 *   and confirm the error is logged/surfaced and the job's `status` reflects it.
 * - [ ] The cadence is correct: read each job's `cron` expression and confirm it
 *   matches the intended schedule (nightly, hourly, …) — verify by reading it,
 *   not by waiting for a tick.
 * - [ ] Any user-facing trigger is locked down: if the app exposes a manual
 *   "run now" or schedule-management endpoint, only an authorized caller can hit
 *   it — an anonymous request can't fire jobs or register arbitrary schedules.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
