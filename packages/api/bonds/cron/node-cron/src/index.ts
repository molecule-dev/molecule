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
 * import { setProvider, schedule } from '@molecule/api-cron'
 * import { provider } from '@molecule/api-cron-node-cron'
 *
 * setProvider(provider)
 *
 * await schedule('cleanup', '0 3 * * *', async () => {
 *   console.log('Nightly cleanup')
 * })
 * ```
 *
 * @remarks
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
