/**
 * Feature flags provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-feature-flags-database`) call
 * `setProvider()` during setup. Application code uses the convenience
 * functions which delegate to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { FeatureFlag, FeatureFlagProvider, FeatureFlagUpdate, FlagContext } from './types.js'

const BOND_TYPE = 'feature-flags'
expectBond(BOND_TYPE)

/**
 * Registers a feature flag provider as the active singleton. Called by
 * bond packages during application startup.
 *
 * @param provider - The feature flag provider implementation to bond.
 */
export const setProvider = (provider: FeatureFlagProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded feature flag provider, throwing if none is configured.
 *
 * @returns The bonded feature flag provider.
 * @throws {Error} If no feature flag provider has been bonded.
 */
export const getProvider = (): FeatureFlagProvider => {
  try {
    return bondRequire<FeatureFlagProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('featureFlags.error.noProvider', undefined, {
        defaultValue: 'Feature flag provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a feature flag provider is currently bonded.
 *
 * @returns `true` if a feature flag provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Checks whether a flag is enabled for the given context using the bonded provider.
 *
 * @param flag - The flag name/key to check.
 * @param context - Optional evaluation context.
 * @returns `true` if the flag is enabled for the given context.
 * @throws {Error} If no feature flag provider has been bonded.
 */
export const isEnabled = async (flag: string, context?: FlagContext): Promise<boolean> => {
  return getProvider().isEnabled(flag, context)
}

/**
 * Retrieves a flag definition by name using the bonded provider.
 *
 * @param flag - The flag name/key.
 * @returns The flag definition, or `null` if not found.
 * @throws {Error} If no feature flag provider has been bonded.
 */
export const getFlag = async (flag: string): Promise<FeatureFlag | null> => {
  return getProvider().getFlag(flag)
}

/**
 * Creates or updates a feature flag using the bonded provider.
 *
 * @param flag - The flag data to create or update.
 * @returns The created or updated flag definition.
 * @throws {Error} If no feature flag provider has been bonded.
 */
export const setFlag = async (flag: FeatureFlagUpdate): Promise<FeatureFlag> => {
  return getProvider().setFlag(flag)
}

/**
 * Retrieves all feature flags using the bonded provider.
 *
 * @returns Array of all flag definitions.
 * @throws {Error} If no feature flag provider has been bonded.
 */
export const getAllFlags = async (): Promise<FeatureFlag[]> => {
  return getProvider().getAllFlags()
}

/**
 * Deletes a feature flag using the bonded provider.
 *
 * @param flag - The flag name/key to delete.
 * @returns Resolves when the flag is removed.
 * @throws {Error} If no feature flag provider has been bonded.
 */
export const deleteFlag = async (flag: string): Promise<void> => {
  return getProvider().deleteFlag(flag)
}

/**
 * Evaluates multiple flags for a specific user using the bonded provider.
 *
 * @param userId - The user identifier.
 * @param flags - Optional list of flag names to evaluate.
 * @returns A record mapping flag names to their enabled state.
 * @throws {Error} If no feature flag provider has been bonded.
 */
export const evaluateForUser = async (
  userId: string,
  flags?: string[],
): Promise<Record<string, boolean>> => {
  return getProvider().evaluateForUser(userId, flags)
}
