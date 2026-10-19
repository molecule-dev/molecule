/**
 * PostgreSQL-coordinated scheduler provider for `@molecule/api-scheduler`:
 * in-process timers that take a per-task session advisory lock, so a scheduled
 * task runs ONCE across every API instance instead of once per instance.
 *
 * ```typescript
 * import { schedule, setProvider, start } from '@molecule/api-scheduler'
 * import { createProvider } from '@molecule/api-scheduler-postgresql'
 *
 * setProvider(createProvider()) // reads DATABASE_URL lazily
 * schedule({ name: 'nightly-sweep', intervalMs: 3_600_000, handler: sweep })
 * start()
 * ```
 *
 * The default scheduler (`@molecule/api-scheduler-default`) runs every task on
 * every instance. With one API process that is correct; behind a load balancer
 * it means N executions per interval — harmless for a sweep that is idempotent,
 * corrupting for anything that mutates shared state. This provider keeps the
 * same timer model (intervals, stagger, `getStatus`) and adds the lock.
 *
 * @remarks
 * - **A skipped tick is not a run.** Only the instance that wins the lock
 *   records `lastRunAt`/`totalRuns`; the others log at debug and wait for the
 *   next tick. A status read on a follower therefore shows the task's last run
 *   on THIS instance.
 * - **The lock is held for the whole run**, not a lease with a TTL: a slow run
 *   cannot overlap its successor. If the holder's connection dies mid-run,
 *   PostgreSQL releases the lock and another instance may start the task while
 *   the first is still finishing — keep handlers idempotent.
 * - **If the lock store is unreachable the run is SKIPPED** (logged at warn),
 *   because two concurrent runs are worse than one missed sweep. Set
 *   `runUncoordinatedOnLockError` only for a task that is safe to double-run.
 * - **Advisory locks share one namespace per database.** `lockClassId`
 *   defaults to `8675311`; a host that uses other advisory locks (the migration
 *   runner uses `8675309`, instance leadership `8675310`) must pass a distinct
 *   class id.
 * - **Transaction-mode poolers break session locks.** Connect directly or
 *   through a session-mode pooler (PgBouncer `pool_mode=session`).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './lock.js'
export * from './provider.js'
export * from './types.js'
