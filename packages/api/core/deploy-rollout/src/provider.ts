/**
 * Accessors for the bonded deploy-rollout provider.
 *
 * A provider bond (e.g. `@molecule/api-deploy-rollout-default`) calls
 * `setProvider()` during application startup. Application code uses the
 * convenience accessors (`runRollout`, `runInPlaceRollout`), which delegate to the
 * bonded provider, so the hosting-specific algorithm is a wiring decision rather
 * than an import.
 *
 * @module
 */

import { bond, isBonded, require as bondRequire } from '@molecule/api-bond'

import type {
  DeployRolloutProvider,
  InPlaceRolloutOptions,
  InPlaceRolloutOutcome,
  RolloutInstance,
  RolloutOptions,
  RolloutOutcome,
} from './types.js'

const BOND_TYPE = 'deploy-rollout'

/**
 * Registers a deploy-rollout provider as the active singleton. Called by a bond
 * package during application startup.
 *
 * @param provider - The provider implementation to bond.
 */
export const setProvider = (provider: DeployRolloutProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded deploy-rollout provider, throwing if none is wired.
 *
 * @returns The bonded provider.
 * @throws {Error} If no deploy-rollout provider has been bonded.
 */
export const getProvider = (): DeployRolloutProvider => {
  try {
    return bondRequire<DeployRolloutProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      'No deploy-rollout provider set. Bond one (e.g. @molecule/api-deploy-rollout-default) at startup.',
      { cause: error },
    )
  }
}

/**
 * Checks whether a deploy-rollout provider is currently bonded.
 *
 * @returns `true` if a provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Runs a grow-then-shrink rollout through the bonded provider.
 *
 * @param options - The set to build, the old set, and the instance provider.
 * @returns What the rollout did.
 */
export const runRollout = <I extends RolloutInstance>(
  options: RolloutOptions<I>,
): Promise<RolloutOutcome<I>> => {
  return getProvider().run(options)
}

/**
 * Runs an in-place rollout (the same instances changed one at a time) through the
 * bonded provider.
 *
 * @param options - The instances to roll and the provider or callbacks.
 * @returns What the rollout did.
 */
export const runInPlaceRollout = <I extends RolloutInstance>(
  options: InPlaceRolloutOptions<I>,
): Promise<InPlaceRolloutOutcome<I>> => {
  return getProvider().runInPlace(options)
}
