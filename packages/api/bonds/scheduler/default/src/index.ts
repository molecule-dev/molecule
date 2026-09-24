/**
 * Default in-process scheduler provider for molecule.dev.
 *
 * Uses setInterval for periodic task execution with staggered startup
 * to prevent thundering herd.
 *
 * @example
 * ```typescript
 * import { getStatus, schedule, setProvider, start, stop } from '@molecule/api-scheduler'
 * import { createProvider } from '@molecule/api-scheduler-default'
 *
 * // Startup: bond once (or `setProvider(provider)` for the default 2000ms stagger).
 * setProvider(createProvider({ staggerMs: 2000 }))
 *
 * let purged = 0
 * schedule({
 *   name: 'purge-expired-sessions',
 *   intervalMs: 15 * 60_000, // MILLISECONDS — every 15 minutes
 *   async handler() {
 *     purged++ // e.g. delete expired rows through the database core
 *   },
 * })
 *
 * // REQUIRED: nothing runs until start(). The first run happens right away
 * // (first task: 0ms, later tasks staggered by staggerMs), then every intervalMs.
 * start()
 *
 * // Moments later: getStatus('purge-expired-sessions')?.totalRuns === 1, purged === 1
 * console.log(getStatus('purge-expired-sessions')?.totalRuns, purged)
 *
 * process.on('SIGTERM', () => stop())
 * ```
 *
 * @remarks
 * - **Nothing runs until `start()`** — `schedule()` only registers. Tasks scheduled
 *   after `start()` begin on their own (staggered).
 * - **The first run is NOT after `intervalMs`**: each task fires once after its stagger
 *   delay (`index * staggerMs`, so the first task at 0ms) and then every `intervalMs`.
 * - **`intervalMs` and `staggerMs` are milliseconds**, not seconds; there is no cron syntax.
 * - **Timers are `unref()`'d** — the scheduler alone does NOT keep a Node process alive. It
 *   is meant to run inside a long-lived server (e.g. next to the HTTP listener). It does not
 *   work on Workers/serverless — use `@molecule/api-scheduler-cloudflare` there.
 * - **In-process only**: every replica runs every task, and nothing is persisted — status
 *   counters reset on restart. A run still in progress when the next tick arrives is
 *   skipped (logged), never overlapped. A throwing handler is caught, logged, and counted
 *   in `totalFailures`; it does not stop the schedule.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'

import type { SchedulerProvider } from '@molecule/api-scheduler'

import { createProvider } from './provider.js'

let _provider: SchedulerProvider | null = null

/**
 * The provider implementation.
 */
export const provider: SchedulerProvider = new Proxy({} as SchedulerProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
