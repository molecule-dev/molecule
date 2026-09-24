/**
 * Health monitoring interface for molecule.dev.
 *
 * Defines MonitoringProvider and SystemHealth interfaces, plus composable
 * factory functions for common health checks (database, cache, HTTP probes,
 * bond registry checks, and custom checks).
 *
 * @example
 * ```typescript
 * import {
 *   createCacheCheck,
 *   createCustomCheck,
 *   createDatabaseCheck,
 *   createHttpCheck,
 *   getProvider,
 *   runAll,
 *   setProvider,
 * } from '@molecule/api-monitoring'
 * import { createProvider } from '@molecule/api-monitoring-default'
 *
 * // Startup, AFTER the database/cache bonds: bond the provider, then register checks.
 * setProvider(createProvider({ checkTimeoutMs: 5000 }))
 * const monitoring = getProvider()
 * monitoring.register(createDatabaseCheck()) // SELECT 1 on the 'database' bond
 * monitoring.register(createCacheCheck()) // set/get/delete on the 'cache' bond
 * monitoring.register(
 *   createHttpCheck('https://api.example.com/health', {
 *     name: 'upstream-api',
 *     degradedThresholdMs: 1000,
 *   }),
 * )
 * monitoring.register(
 *   createCustomCheck('disk', async () => ({ status: 'operational', message: 'ok' })),
 * )
 *
 * // GET /health handler: runAll() never rejects — map the worst status to an HTTP code.
 * const health = await runAll()
 * const httpStatus = health.status === 'down' ? 503 : 200
 * // health.checks.database → { status, latencyMs, message?, checkedAt, ... }
 * ```
 *
 * @remarks
 * - **Nothing works until a provider is bonded** — `getProvider()` / `runAll()`
 *   throw before `setProvider()`. Register checks once at startup, not per request.
 * - The overall `status` is the WORST check (`down` > `degraded` >
 *   `operational`); a single `down` dependency marks the whole system `down`.
 * - `createDatabaseCheck()` / `createCacheCheck()` report `down` ("bond not
 *   configured") when the `database` / `cache` bond is not wired — they never
 *   throw.
 * - `createHttpCheck()` uses the global `fetch` with a GET; `timeoutMs`
 *   (default 5000) and `degradedThresholdMs` are MILLISECONDS. Any 2xx is
 *   healthy unless `expectedStatus` is set.
 * - Don't expose `message` details (internal hostnames, error text) on a
 *   public health endpoint — return only the status publicly.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './checks.js'
export * from './provider.js'
export * from './types.js'
