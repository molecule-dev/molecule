/**
 * Process lifecycle core interface for molecule.dev.
 *
 * Defines the contract a process uses to report readiness and liveness, drain
 * before shutdown, and run ordered teardown hooks. The interface carries no
 * implementation: `@molecule/api-process-lifecycle-express` provides the
 * Express/Node binding that mounts health endpoints and handles SIGTERM/SIGINT.
 *
 * @example
 * ```typescript
 * import {
 *   getProvider,
 *   registerReadinessCheck,
 *   registerShutdownHook,
 *   isReady,
 * } from '@molecule/api-process-lifecycle'
 * import { provider } from '@molecule/api-process-lifecycle-express'
 * import { setProvider } from '@molecule/api-process-lifecycle'
 *
 * // Wire the provider once at startup
 * setProvider(provider)
 *
 * // Readiness gates a load balancer; hooks close what the process owns
 * registerReadinessCheck({ name: 'database', check: async () => db.ping() })
 * registerShutdownHook({ name: 'database-pool', run: () => db.pool.end() })
 *
 * const report = await isReady()
 * // report.ready === false while draining
 * ```
 *
 * @remarks
 * - **Liveness and readiness answer different questions.** Liveness asks "is
 *   this process alive?" and stays `true` while draining (restarting a draining
 *   process would abort the requests the drain is finishing). Readiness asks
 *   "may traffic be routed here?" and turns `false` at the first
 *   `startDraining()` call.
 * - **Checks are individually bounded.** A check that hangs is reported as
 *   failed at its timeout instead of holding the health endpoint open. A check
 *   that throws is a failed check, never an unhandled rejection.
 * - **Critical vs non-critical.** Only critical failures change the verdict;
 *   non-critical results are visible in the report so a degraded dependency can
 *   be observed without taking the whole process out of rotation.
 * - **Read `getProvider()` after bonds are wired.** Like every bond-backed
 *   accessor, these throw when no provider is bonded, so do not call them at
 *   module top level.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
