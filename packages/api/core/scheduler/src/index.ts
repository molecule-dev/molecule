/**
 * Task scheduler interface for molecule.dev.
 *
 * Defines SchedulerProvider and ScheduledTask interfaces for periodic
 * background task execution.
 *
 * @example
 * ```typescript
 * import { schedule, setProvider, start } from '@molecule/api-scheduler'
 * import { provider } from '@molecule/api-scheduler-default'
 *
 * setProvider(provider)
 *
 * schedule({
 *   name: 'cleanup',
 *   intervalMs: 60000,
 *   async handler() {
 *     await cleanupExpiredRecords()
 *   },
 * })
 *
 * // REQUIRED: tasks do not execute until the scheduler is started.
 * // (Tasks scheduled after start() begin automatically.)
 * start()
 * ```
 *
 * @remarks
 * - **Nothing runs until `start()`** — call it once at server startup after wiring bonds.
 *   Tasks scheduled after `start()` begin automatically; `stop()` halts everything.
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
