/**
 * Fly Machines provider bonds for the deploy-rollout core.
 *
 * In-place (restart the same Machines one at a time, with a restore path) and
 * grow-then-shrink (clone a Machine beside the old set, retire the old one when the
 * new one serves). Commands run through an injected runner, so tests need no Fly
 * account.
 *
 * @example
 * ```typescript
 * import { runInPlaceRollout, setProvider } from '@molecule/api-deploy-rollout'
 * import { provider } from '@molecule/api-deploy-rollout-default'
 * import { createFlyInPlaceProvider } from '@molecule/api-deploy-rollout-fly'
 *
 * setProvider(provider)
 * await runInPlaceRollout({
 *   provider: createFlyInPlaceProvider({
 *     app: 'molecule-api',
 *     isServing: (id) => probeMachine(id),
 *     restore: (id) => clearPatchAndRestart(id),
 *   }),
 *   policy: { soakMs: 30_000 },
 * })
 * ```
 *
 * @remarks
 * - **`parseFlyMachineList` is the only JSON the adapter trusts.** A Machine list
 *   that is not an array is an error, never an empty set.
 * - **A mixed set is refused.** `assertHomogeneousFlyMachines` rejects Machines on
 *   different images. Each Machine has its own configuration version; the returned
 *   `machineVersions` maps Machine ids to those versions. Bind each patch to its
 *   target's version so a later image or configuration update retires it.
 * - **A restart that parks is started explicitly.** A Machine that comes back
 *   `stopped`/`suspended` after a restart is started, not left parked.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './fly.js'
