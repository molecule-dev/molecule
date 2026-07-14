/**
 * External authentication bond accessor.
 *
 * Bond packages (e.g. `@molecule/api-external-auth-supabase`) call
 * `setProvider()` during setup. Application code uses `verifyUserToken()`
 * directly.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'

import type { ExternalAuthProvider } from './types.js'

const BOND_TYPE = 'external-auth'
expectBond(BOND_TYPE)

/**
 * Registers an external-auth provider as the active singleton. Called by
 * bond packages (matched to the imported app's auth platform) during
 * application startup.
 *
 * @param provider - The external-auth provider implementation to bond.
 */
export const setProvider = (provider: ExternalAuthProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded external-auth provider, throwing if none is
 * configured.
 *
 * @returns The bonded external-auth provider.
 * @throws {Error} If no external-auth provider has been bonded.
 */
export const getProvider = (): ExternalAuthProvider => {
  return bondRequire<ExternalAuthProvider>(BOND_TYPE)
}

/**
 * Checks whether an external-auth provider is currently bonded.
 *
 * @returns `true` if an external-auth provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}
