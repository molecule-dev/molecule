/**
 * Accessors for the bonded upstream-balancer provider.
 *
 * A provider bond (e.g. `@molecule/api-upstream-balancer-default`) calls
 * `setProvider()` during application startup. The edge uses the convenience
 * accessors (`pickUpstream`, `pickRetryUpstream`, `noteUpstreamFailure`, …), which
 * delegate to the bonded provider, so the balancing policy is a wiring decision
 * rather than an import.
 *
 * @module
 */

import { bond, isBonded, require as bondRequire } from '@molecule/api-bond'

import type { UpstreamBalancerProvider, UpstreamMember } from './types.js'

const BOND_TYPE = 'upstream-balancer'

/**
 * Registers an upstream-balancer provider as the active singleton. Called by a
 * bond package during application startup.
 *
 * @param provider - The provider implementation to bond.
 */
export const setProvider = (provider: UpstreamBalancerProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded upstream-balancer provider, throwing if none is wired.
 *
 * @returns The bonded provider.
 * @throws {Error} If no upstream-balancer provider has been bonded.
 */
export const getProvider = (): UpstreamBalancerProvider => {
  try {
    return bondRequire<UpstreamBalancerProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      'No upstream-balancer provider set. Bond one (e.g. @molecule/api-upstream-balancer-default) at startup.',
      { cause: error },
    )
  }
}

/**
 * Checks whether an upstream-balancer provider is currently bonded.
 *
 * @returns `true` if a provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Chooses the upstream for one request through the bonded provider.
 *
 * @param host - The public host the request arrived for.
 * @param members - The host's upstreams, primary first.
 * @returns The member to dial.
 */
export const pickUpstream = <U extends UpstreamMember>(host: string, members: readonly U[]): U => {
  return getProvider().pick(host, members)
}

/**
 * Chooses the upstream for a retry through the bonded provider.
 *
 * @param host - The public host the request arrived for.
 * @param avoid - The member the failed attempt addressed.
 * @param members - The host's upstreams, primary first.
 * @returns The member for the next attempt.
 */
export const pickRetryUpstream = <U extends UpstreamMember>(
  host: string,
  avoid: U,
  members: readonly U[],
): U => {
  return getProvider().pickRetry(host, avoid, members)
}

/**
 * Records a failed attempt against one upstream.
 *
 * @param upstream - The member the attempt addressed.
 */
export const noteUpstreamFailure = (upstream: UpstreamMember): void => {
  getProvider().noteFailure(upstream)
}

/**
 * Records that one upstream answered.
 *
 * @param upstream - The member that answered.
 */
export const noteUpstreamSuccess = (upstream: UpstreamMember): void => {
  getProvider().noteSuccess(upstream)
}

/**
 * Reports whether an upstream's failure mark is still fresh.
 *
 * @param upstream - The candidate.
 * @returns `true` while it should be skipped.
 */
export const upstreamSuspect = (upstream: UpstreamMember): boolean => {
  return getProvider().isSuspect(upstream)
}

/**
 * Marks an upstream as draining by key (`host:port`).
 *
 * @param key - The member's `host:port`.
 */
export const markUpstreamDraining = (key: string): void => {
  getProvider().markDraining(key)
}

/**
 * Clears an upstream's draining mark.
 *
 * @param key - The member's `host:port`.
 */
export const clearUpstreamDraining = (key: string): void => {
  getProvider().clearDraining(key)
}

/**
 * Reports whether an upstream must receive no new request.
 *
 * @param upstream - The candidate.
 * @returns `true` while it is draining.
 */
export const upstreamDraining = (upstream: UpstreamMember): boolean => {
  return getProvider().isDraining(upstream)
}

/**
 * Drops every cursor and mark. Test-only; application code never calls it.
 */
export const resetUpstreamBalancerForTest = (): void => {
  getProvider().reset()
}
