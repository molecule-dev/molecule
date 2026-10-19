/**
 * Accessors for the bonded instance-leadership provider.
 *
 * A provider bond (e.g. `@molecule/api-instance-leadership-postgresql`) calls
 * `setProvider()` during application startup. Application code uses the
 * convenience accessors (`acquireLeadership`, `isLeader`, …), which delegate to
 * the bonded provider.
 *
 * @module
 */

import { bond, isBonded, require as bondRequire } from '@molecule/api-bond'

import type {
  AcquireLeadershipOptions,
  InstanceLeadershipProvider,
  LeadershipState,
} from './types.js'

const BOND_TYPE = 'instance-leadership'

/**
 * Registers an instance-leadership provider as the active singleton. Called by
 * a bond package during application startup.
 *
 * @param provider - The provider implementation to bond.
 */
export const setProvider = (provider: InstanceLeadershipProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded instance-leadership provider, throwing if none is wired.
 *
 * @returns The bonded instance-leadership provider.
 * @throws {Error} If no instance-leadership provider has been bonded.
 */
export const getProvider = (): InstanceLeadershipProvider => {
  try {
    return bondRequire<InstanceLeadershipProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      'No instance-leadership provider set. Bond one (e.g. @molecule/api-instance-leadership-postgresql) at startup.',
      { cause: error },
    )
  }
}

/**
 * Checks whether an instance-leadership provider is currently bonded.
 *
 * @returns `true` if a provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Whether THIS instance currently holds platform leadership.
 *
 * @returns `false` when no provider is bonded or this instance is a follower.
 */
export const isLeader = (): boolean => {
  return hasProvider() ? getProvider().isLeader() : false
}

/**
 * The current leadership phase of this instance.
 *
 * @returns The bonded provider's state, or `'follower'` when none is bonded.
 */
export const leadershipState = (): LeadershipState => {
  return hasProvider() ? getProvider().state() : 'follower'
}

/**
 * Starts contending for platform leadership through the bonded provider.
 *
 * @param options - What to start on acquisition and stop on loss.
 * @throws {Error} If no instance-leadership provider has been bonded.
 */
export const acquireLeadership = (options: AcquireLeadershipOptions): void => {
  getProvider().acquire(options)
}

/**
 * Releases platform leadership through the bonded provider so another
 * instance can take over immediately.
 *
 * @returns Resolves once the release settles; a no-op when no provider is bonded.
 */
export const releaseLeadership = async (): Promise<void> => {
  if (hasProvider()) await getProvider().release()
}
