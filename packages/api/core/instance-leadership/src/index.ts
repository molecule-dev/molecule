/**
 * Instance-leadership core interface for molecule.dev: elect ONE API instance
 * to run platform-wide singleton work, and hand leadership over within seconds
 * when the holder's connection is lost.
 *
 * Bond a provider — `@molecule/api-instance-leadership-postgresql` — at
 * startup, then start leader-only work from `acquireLeadership()`:
 *
 * ```typescript
 * import { acquireLeadership, isLeader } from '@molecule/api-instance-leadership'
 * import { provider } from '@molecule/api-instance-leadership-postgresql'
 * import { setProvider } from '@molecule/api-instance-leadership'
 *
 * setProvider(provider)
 *
 * acquireLeadership({
 *   onAcquired: () => startPoolManager(),
 *   onLost: () => stopPoolManager(),
 * })
 * ```
 *
 * **Only the code you run inside `onAcquired` is leader-only.** Every instance
 * still serves HTTP traffic, processes queue messages, and answers readiness
 * probes. Reach for this package when a job must run once across the whole
 * platform — pre-warm pool managers, retention sweeps, status recorders,
 * periodic billing — not for anything request-driven.
 *
 * Use `isLeader()` for facts that must be decided at call time (e.g. skipping a
 * duplicate periodic tick); use `onAcquired`/`onLost` to start and stop the
 * loops themselves.
 *
 * @remarks
 * - **The lock must live in a store every instance shares.** A host-local lock
 *   (a loopback port, a file) elects one leader PER HOST, so every singleton
 *   runs twice — the failure this package exists to prevent.
 * - **`onLost` is not optional in practice for a real leader.** A provider may
 *   lose the lock while the process keeps running (a database connection that
 *   errors); the instance demotes itself and another may already be leading.
 *   Stop the loops in `onLost`, or two copies run.
 * - **Re-acquisition is possible.** `onAcquired` runs again after a loss, so
 *   it must be safe to call after `onLost` stopped everything.
 * - **Followers retry forever in the background.** `acquireLeadership()` never
 *   rejects and never blocks; a database that is down at boot just means this
 *   instance stays a follower until it is reachable.
 * - **No provider bonded ⇒ `isLeader()` is `false`.** A single-instance app can
 *   use this package unchanged (it never leads until a bond exists) or omit it
 *   and run its singleton work directly.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
