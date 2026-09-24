/**
 * Task scheduler interface for molecule.dev.
 *
 * Defines SchedulerProvider and ScheduledTask interfaces for periodic
 * background task execution.
 *
 * @example
 * ```typescript
 * import { getStatus, schedule, setProvider, start, stop } from '@molecule/api-scheduler'
 * import { createProvider } from '@molecule/api-scheduler-default'
 *
 * // Startup: bond the in-process scheduler (tasks are staggered 2 s apart by default).
 * setProvider(createProvider({ staggerMs: 2000 }))
 *
 * const sessions = new Map<string, { expiresAt: number }>() // your session table in a real app
 *
 * schedule({
 *   name: 'sessions:purge-expired', // stable + unique — re-scheduling a name REPLACES it
 *   intervalMs: 15 * 60 * 1000, // MILLISECONDS between runs; no cron syntax
 *   async handler() {
 *     const now = Date.now()
 *     for (const [id, session] of sessions) if (session.expiresAt <= now) sessions.delete(id)
 *   },
 * })
 *
 * // REQUIRED: nothing runs until start(). The first run fires right away, then every intervalMs.
 * start()
 *
 * // Health check: handler errors are caught — surface them from the status.
 * const status = getStatus('sessions:purge-expired') // { totalRuns, lastError, nextRunAt, … }
 *
 * // Graceful shutdown.
 * process.once('SIGTERM', () => stop())
 * ```
 *
 * @remarks
 * - **Nothing runs until `start()`** — call it once at server startup after wiring bonds.
 *   Tasks scheduled after `start()` begin automatically; `stop()` halts everything.
 * - **With the default bond the FIRST run is at `start()`** (offset only by the per-task
 *   stagger, `staggerMs` default 2000), not one `intervalMs` later — a handler must be safe
 *   to run on every boot.
 * - **Intervals only — there is NO cron syntax.** {@link ScheduledTask} takes `intervalMs`
 *   (milliseconds between runs); a cron expression string is not understood. For
 *   calendar-time schedules compute the interval or use a cron-capable package.
 * - **The scheduler is in-process and unpersisted.** Every server instance runs its own copy
 *   of every task — N instances execute a task N times unless the handler itself dedupes
 *   (e.g. an atomic claim in the database). Schedules and run history are lost on restart;
 *   missed runs are not caught up.
 * - A tick that arrives while the previous execution is still running is SKIPPED — a handler
 *   slower than its `intervalMs` lowers its own frequency instead of overlapping.
 * - Handler errors are caught and recorded on {@link TaskStatus} (`lastError`,
 *   `totalFailures`) — they don't crash the process, and they're invisible unless you check
 *   `getStatus()`/`getAllStatuses()` or log inside the handler.
 * - `schedule()` with an existing `name` REPLACES that task — use stable, unique names.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
