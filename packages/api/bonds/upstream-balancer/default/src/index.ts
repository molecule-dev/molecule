/**
 * Default upstream-balancer provider for molecule.dev.
 *
 * Health-aware round-robin over a host's upstream set, with a failure cooldown, a
 * retry that lands on a different member, and drain-awareness. In-memory state only;
 * wire it once per process (or create several with `createProvider()` for tests).
 *
 * @example
 * ```typescript
 * import { setProvider, pickUpstream } from '@molecule/api-upstream-balancer'
 * import { provider } from '@molecule/api-upstream-balancer-default'
 *
 * setProvider(provider)
 * const target = pickUpstream('app.example.com', members)
 * ```
 *
 * @remarks
 * - **One member is returned unchanged**, so a single-instance deployment keeps
 *   exactly its previous code path.
 * - **Suspect and draining members are skipped** while any other member is eligible;
 *   when none is, one member is still returned.
 * - **`reset()` is test-only** and drops every cursor and mark.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
