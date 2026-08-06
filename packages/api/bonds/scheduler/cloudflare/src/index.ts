/**
 * `@molecule/api-scheduler-cloudflare` — a `@molecule/api-scheduler` provider
 * for Cloudflare Workers, where **the platform owns the clock**.
 *
 * `@molecule/api-scheduler-default` keeps tasks running with `setInterval`,
 * which needs a long-lived process. A Worker has none: it is an isolate that
 * exists for one invocation. So this provider registers tasks and runs them
 * when a **Cron Trigger** fires, via `runDueTasks()` from the Worker's
 * `scheduled()` handler. The application code that calls `schedule()` does not
 * change — only the bond wired in `bonds/`.
 *
 * @example
 * ```typescript
 * import { schedule, setProvider, start } from '@molecule/api-scheduler'
 * import { createProvider } from '@molecule/api-scheduler-cloudflare'
 *
 * const scheduler = createProvider()
 * setProvider(scheduler)
 *
 * schedule({
 *   name: 'monitor-sweep',
 *   intervalMs: 60000,
 *   async handler() {
 *     // ...
 *   },
 * })
 *
 * // REQUIRED, same as the default provider: nothing runs until start().
 * // Unlike it, start() begins no timers — a Worker has no process to hold one.
 * start()
 *
 * // Then, from the Worker's scheduled() handler, wrapped in ctx.waitUntil():
 * //   export default { async scheduled(event, env, ctx) {
 * //     ctx.waitUntil(scheduler.runDueTasks())
 * //   } }
 * // and in wrangler.toml:  [triggers] crons = ["* * * * *"]
 * void scheduler.runDueTasks()
 * ```
 *
 * @remarks
 * - **`intervalMs` is not honoured by default, and that is deliberate.** The
 *   Cron Trigger cadence is the real schedule. A Worker isolate is short-lived
 *   and there may be many, so "when did this task last run" is not reliably
 *   known in-process; skipping a task on that basis can mean it never runs.
 *   Set the interval you want in `wrangler.toml`, not in `intervalMs`. The
 *   `respectIntervalWithinIsolate` option exists for the case where a duplicate
 *   run costs more than a missed one, and even then it is best-effort.
 * - **Nothing runs until `start()` is called**, exactly as with the default
 *   provider. `runDueTasks()` on a stopped scheduler logs a warning and returns
 *   an empty array rather than silently doing nothing — a Cron Trigger firing
 *   into a stopped scheduler otherwise looks identical to having no work.
 * - **`TaskStatus.nextRunAt` is always `null`.** Only the platform knows when
 *   the next trigger fires, and this code cannot read the cron expression.
 *   Computing a plausible-looking time would be a guess presented as a fact.
 * - **Status counters live in the isolate and do not persist.** They are useful
 *   for the current invocation, not as a run history — persist to D1/KV if you
 *   need that.
 * - **Wrap `runDueTasks()` in `ctx.waitUntil()`** so the invocation is not
 *   cut short. The scheduled handler has a 15-minute budget; a sweep that
 *   exceeds it is killed mid-task.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
