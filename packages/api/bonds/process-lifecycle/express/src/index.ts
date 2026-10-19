/**
 * Express/Node provider for `@molecule/api-process-lifecycle`.
 *
 * Gives a scaffolded API the operational surface a rolling or blue/green
 * deploy needs out of the box:
 *
 * - `GET /health/live` — is the process alive (200 while draining too).
 * - `GET /health/ready` — may a load balancer route here (503 while draining,
 *   or when a critical readiness check fails).
 * - Request tracking with `Connection: close` on responses while draining.
 * - SIGTERM/SIGINT handlers that drain in-flight requests (default bound 25 s,
 *   `SHUTDOWN_TIMEOUT_MS`; load-balancer flip wait `SHUTDOWN_LB_FLIP_WAIT_MS`),
 *   run ordered shutdown hooks (database pool, Redis, queues), and exit 0.
 *
 * @example
 * ```typescript
 * import { installExpressLifecycle } from '@molecule/api-process-lifecycle-express'
 * import { registerReadinessCheck, registerShutdownHook } from '@molecule/api-process-lifecycle'
 *
 * const app = express()
 * const lifecycle = installExpressLifecycle({ app }) // mounts /health/live + /health/ready
 *
 * registerReadinessCheck({ name: 'database', check: async () => db.ping() })
 * registerShutdownHook({ name: 'database-pool', run: () => db.pool.end() })
 *
 * const server = app.listen(4000, () => lifecycle.markReady())
 * lifecycle.attachServer(server)
 * ```
 *
 * @remarks
 * - Mount `installExpressLifecycle` before application routes so every request
 *   is counted by the drain.
 * - Readiness and liveness are deliberately different: liveness stays 200 while
 *   draining, so a supervisor does not restart a process that is finishing
 *   in-flight work.
 * - A second signal during a drain exits immediately with code 1; the handlers
 *   never throw.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './express.js'
export * from './lifecycle.js'
export * from './shutdown.js'
export * from './types.js'
export * from './warmup.js'
