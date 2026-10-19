/**
 * Upstream-balancer core interface for molecule.dev.
 *
 * A public host resolves to a SET of upstreams; this contract decides which member
 * one request goes to. It is the selection policy an edge uses — health-aware
 * round-robin, a passive failure cooldown, a retry that lands on a different member,
 * and drain-awareness — not a proxy and not a load-balancer appliance.
 *
 * @example
 * ```typescript
 * import { setProvider, pickUpstream, noteUpstreamFailure } from '@molecule/api-upstream-balancer'
 * import { provider } from '@molecule/api-upstream-balancer-default'
 *
 * setProvider(provider)
 *
 * const target = pickUpstream('app.example.com', [primary, replica1, replica2])
 * try {
 *   await forward(target)
 * } catch (error) {
 *   noteUpstreamFailure(target)
 *   throw error
 * }
 * ```
 *
 * @remarks
 * - **A single-member set is returned unchanged.** This is what keeps a
 *   one-instance deployment on exactly its previous code path.
 * - **A failure mark is a cooldown, not a verdict.** After the policy's cooldown the
 *   member is eligible again even if nothing succeeded against it.
 * - **Never blank the set.** When every member is suspect or draining, one is still
 *   returned — answering every request with an error is worse than one more try.
 * - **Draining means no NEW requests.** A deploy marks a retiring instance so the
 *   edge stops choosing it while its in-flight requests finish.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
