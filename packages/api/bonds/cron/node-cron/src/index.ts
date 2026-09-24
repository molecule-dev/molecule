/**
 * node-cron scheduling provider for molecule.dev.
 *
 * Implements the `CronProvider` interface using the `node-cron` library for
 * lightweight in-process cron scheduling. Supports standard cron expressions,
 * timezone configuration, pause/resume, and manual triggering. Jobs are
 * in-memory and do not persist across process restarts.
 *
 * @example
 * ```typescript
 * import { close, list, runNow, schedule, setProvider } from '@molecule/api-cron'
 * import { createProvider } from '@molecule/api-cron-node-cron'
 *
 * // Startup: bond the in-process scheduler once (no Redis, no env vars needed).
 * setProvider(createProvider({ timezone: 'UTC' }))
 *
 * // Register every job at startup — jobs are in-memory and gone after a restart.
 * const jobId = await schedule(
 *   'nightly-cleanup',
 *   '0 3 * * *', // 03:00 every day (UTC, from the provider's timezone)
 *   async () => {
 *     console.log('nightly cleanup ran at', new Date().toISOString())
 *   },
 *   { noOverlap: true },
 * )
 *
 * await runNow(jobId) // run it immediately, e.g. from an admin endpoint
 * const [job] = await list() // job.status === 'active', job.runCount === 1
 *
 * // Graceful shutdown: stop the timers so the process can exit.
 * process.on('SIGTERM', () => void close())
 * ```
 *
 * @remarks
 * - **Wire it through the core**: `setProvider(provider)` (or `createProvider({ timezone })`)
 *   from `@molecule/api-cron`, not `bond('cron-node-cron', ...)`.
 * - **`schedule()` returns a generated job id, NOT the name** — keep the returned id for
 *   `runNow`/`pause`/`resume`/`cancel`; passing the name throws "Cron job not found".
 * - A handler that throws does NOT cancel the job: the error is logged (with
 *   the job id and name) and the job stays `active` for its next tick — the
 *   same keep-running semantics as the BullMQ bond and real crontab. Add your
 *   own retry/alerting inside the handler if a failure needs escalation.
 * - `schedule()` rejects a malformed cron expression up front with an error
 *   naming the job and the expression (raw node-cron would throw an opaque
 *   `TypeError`/`RangeError`). Both 5-field (`'0 3 * * *'`) and 6-field
 *   seconds-granularity (`'* * * * * *'` = every second) expressions work.
 * - Jobs are in-memory only: they are lost on process restart, so re-register
 *   them at startup. For persistent/distributed jobs use `@molecule/api-cron-bullmq`.
 * - `CronOptions.noOverlap: true` skips a tick that arrives while the
 *   previous execution of the same job is still running (node-cron logs
 *   `'task still running, new execution blocked by overlap prevention!'`
 *   itself). Default `false` — overlapping runs are allowed, unchanged from
 *   before this option existed.
 * - `CronOptions.maxRuns` is enforced both on scheduled ticks AND on manual
 *   `runNow()` calls — once the cap is reached (by either), the job is
 *   marked `'completed'` and stops ticking.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
