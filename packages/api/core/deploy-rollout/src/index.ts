/**
 * Deploy-rollout core interface for molecule.dev.
 *
 * Replaces the running instances of a deployment with new ones without taking the
 * deployment down — grow-then-shrink (create the new set, gate it ready, join it,
 * then retire the old one at a time) and in-place (change the same instances one at
 * a time, with a restore path). The package carries the contract only:
 * `@molecule/api-deploy-rollout-default` is the algorithm, `-fly` and `-sandbox`
 * adapt concrete instance providers.
 *
 * @example
 * ```typescript
 * import { setProvider, runRollout } from '@molecule/api-deploy-rollout'
 * import { provider } from '@molecule/api-deploy-rollout-default'
 *
 * setProvider(provider)
 *
 * const outcome = await runRollout({
 *   provider: myInstanceProvider,
 *   current: oldInstances,
 *   policy: { replicas: 2, soakMs: 30_000, drainMs: 25_000 },
 * })
 * // outcome.status === 'completed' when the new set is serving
 * ```
 *
 * @remarks
 * - **The core has no implementation.** The state machine, the soak, the capacity
 *   floor and the reverse rollback live in a bond, so a caller can swap in a
 *   provider whose rules differ without touching its own code.
 * - **Never reduces healthy capacity below the floor.** A step that would leave
 *   fewer healthy instances than the policy allows is refused, not attempted.
 * - **An abort keeps the old set serving.** Every instance created or changed by
 *   the run is undone, newest first, before the error is thrown.
 * - **Idempotent resume.** Re-running a rollout after an interruption reconciles
 *   against the provider's current instances instead of creating duplicates.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
