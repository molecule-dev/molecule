/**
 * Default deploy-rollout provider for molecule.dev.
 *
 * Implements the two real deployment topologies over any instance provider:
 * grow-then-shrink (create the new set, gate it ready, join it, then retire the old
 * one at a time) and in-place (change the same instances one at a time, with a
 * reverse restore on failure). No I/O of its own, no clock other than an injected
 * one, no knowledge of where the instances live.
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
 *   policy: { replicas: 2, soakMs: 30_000 },
 * })
 * ```
 *
 * @remarks
 * - **Capacity floor first.** `policy.minHealthy` (default 1) is checked before
 *   every retirement; a step that would go below it aborts instead of running.
 * - **Soak is continuous.** With `soakMs > 0` the instance must keep answering
 *   `isServing`; a gap restarts the window (a fresh process can pass one probe while
 *   its event loop is still warming).
 * - **Rollback is reverse.** Instances this run changed are restored newest first; a
 *   restore failure does not stop the remaining restores.
 * - **Resume is a no-op when complete.** A re-run reconciles against the provider's
 *   own `list()` where it has one, so an interrupted rollout does not create a
 *   duplicate set.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
