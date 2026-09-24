/**
 * Default in-process monitoring provider for molecule.dev.
 *
 * Stores registered checks in memory and runs them in parallel on each
 * runAll() call. No external dependencies. Suitable for all deployment sizes.
 *
 * @example
 * ```typescript
 * import {
 *   createCustomCheck,
 *   createHttpCheck,
 *   getProvider,
 *   runAll,
 *   setProvider,
 * } from '@molecule/api-monitoring'
 * import { createProvider } from '@molecule/api-monitoring-default'
 *
 * // Startup: bond once, then register checks ONCE (not per request).
 * setProvider(createProvider({ checkTimeoutMs: 5000 }))
 * const monitoring = getProvider()
 * monitoring.register(
 *   createHttpCheck(process.env.PAYMENTS_HEALTH_URL ?? 'https://payments.example.com/health', {
 *     name: 'payments-api',
 *     degradedThresholdMs: 1000,
 *   }),
 * )
 * const queueBacklog = async (): Promise<number> => 12 // your queue's size() in a real app
 * monitoring.register(
 *   createCustomCheck('job-queue', async () => {
 *     const waiting = await queueBacklog()
 *     return waiting > 1000
 *       ? { status: 'degraded', message: `${waiting} jobs waiting` }
 *       : { status: 'operational' }
 *   }),
 * )
 *
 * // GET /health handler: runAll() never rejects — map the worst status to an HTTP code.
 * const health = await runAll()
 * const httpStatus = health.status === 'down' ? 503 : 200
 * // health.checks['payments-api'] → { name, category: 'external', status, latencyMs, checkedAt }
 * ```
 *
 * @remarks
 * - Bond with `setProvider(...)` from `@molecule/api-monitoring`, then register
 *   checks on `getProvider()` — `register()` is a PROVIDER method, not a core
 *   export. Checks live in memory: re-register them on every process start.
 * - `checkTimeoutMs` is MILLISECONDS per check (checks run in parallel).
 * - **`runAll()` never rejects.** A check that THROWS (easy with
 *   `createCustomCheck`) becomes a `'down'` entry carrying the thrown message;
 *   a check that exceeds `checkTimeoutMs` (default 10000) becomes a `'down'`
 *   entry with `Check timed out after {ms}ms.` — so callers can tell a hung
 *   dependency from a failing one, and one bad check never turns the whole
 *   /health endpoint into an opaque 500.
 * - The overall `status` is the worst individual status
 *   (`down` > `degraded` > `operational`); an empty registry reports
 *   `operational`.
 * - **`runAll()` logs a per-check line at `warn` only on a status
 *   TRANSITION** (comparing against the previous `runAll()` snapshot) —
 *   `operational → down`/`degraded`, or the reverse (`recovered`, at `info`).
 *   A steady-state repeat of an already-reported down/degraded check logs at
 *   `debug` instead, so polling a `/health` endpoint every few seconds with
 *   one persistently failing dependency does not flood `warn` with identical
 *   lines that bury the transition that actually matters.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'

import type { MonitoringProvider } from '@molecule/api-monitoring'

import { createProvider } from './provider.js'

/** Default provider instance (lazy-initialised singleton). */
let _provider: MonitoringProvider | null = null

/**
 * The provider implementation.
 */
export const provider: MonitoringProvider = new Proxy({} as MonitoringProvider, {
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
