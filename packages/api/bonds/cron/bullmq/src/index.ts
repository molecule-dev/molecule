/**
 * BullMQ cron scheduling provider for molecule.dev.
 *
 * Implements the `CronProvider` interface using BullMQ repeatable jobs backed
 * by Redis. The schedule (the repeatable job definition in Redis) is
 * persistent and distributed — it survives process restarts and produces
 * ticks that any worker process sharing the queue can pick up. The handler
 * function itself, and this bond's local `list()`/pause state, are NOT
 * persisted — see the remarks below.
 *
 * @example
 * ```typescript
 * import { setProvider, schedule } from '@molecule/api-cron'
 * import { createProvider } from '@molecule/api-cron-bullmq'
 *
 * const provider = createProvider({
 *   connection: { host: 'localhost', port: 6379 },
 *   onError: (error) => console.error('cron Redis connection error', error),
 * })
 * setProvider(provider)
 *
 * await schedule('cleanup', '0 3 * * *', async () => {
 *   console.log('Nightly cleanup')
 * })
 * ```
 *
 * @remarks
 * - **`schedule()` must be called for every job on every process boot** —
 *   including after a restart. The repeatable job scheduler lives in Redis
 *   and keeps ticking across restarts, but the JavaScript handler function
 *   passed to `schedule()` only lives in this process's memory. A tick for a
 *   job this process hasn't (re-)registered logs a warning
 *   (`"...has no registered handler in this process..."`) and no-ops rather
 *   than silently dropping the tick.
 * - `list()` and `getStatus`-style reads only reflect jobs registered on
 *   THIS process — they do NOT query Redis for jobs registered by other
 *   worker processes. `cancel()` still works for a job unknown to this
 *   process's memory (it falls through to `queue.removeJobScheduler`).
 * - `pause()`/`resume()` are cluster-wide: a paused flag is written to Redis
 *   and checked by every worker sharing the queue on every tick, so pausing
 *   on one process stops execution on all of them (not just the caller).
 *   Note this only affects the handler *running* — BullMQ still records a
 *   normal 'completed' entry for the skipped tick; that's expected, not a
 *   hidden error.
 * - Worker/job errors are never swallowed: a thrown handler is logged (with
 *   the job name) AND rethrown so BullMQ marks that occurrence 'failed' —
 *   the repeatable schedule itself keeps ticking (a transient failure does
 *   not kill the job, same semantics as the node-cron bond and real
 *   crontab). Queue/worker-level connection errors (e.g. Redis unreachable)
 *   are logged with an actionable message instead of the silent hang you'd
 *   otherwise get while ioredis retries the connection indefinitely; pass
 *   `onError` for additional handling.
 * - `CronOptions.noOverlap: true` is emulated per-worker-process (an
 *   in-memory `running` flag) — it prevents a slow handler from overlapping
 *   itself on the SAME worker, but does not coordinate across multiple
 *   distributed worker processes running the same job concurrently.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
