/**
 * Auth client bond accessor.
 *
 * Bond packages call `setClient()` during setup. Application code uses
 * `getClient()` to access login, logout, register, token management,
 * and auth state subscription.
 *
 * @module
 */

import { bond, isBonded, require as bondRequire } from '@molecule/app-bond'

import type { AuthClient, UserProfile } from './types.js'

const BOND_TYPE = 'auth-client'

/**
 * Registers an auth client as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param client - The auth client implementation to bond.
 */
export const setClient = (client: AuthClient): void => {
  bond(BOND_TYPE, client)
}

/**
 * Retrieves the bonded auth client, throwing if none is configured.
 *
 * @returns The bonded auth client.
 * @throws {Error} If no auth client has been bonded.
 */
export const getClient = <T extends UserProfile = UserProfile>(): AuthClient<T> => {
  return bondRequire<AuthClient<T>>(BOND_TYPE)
}

/**
 * Checks whether an auth client is currently bonded.
 *
 * @returns `true` if an auth client is bonded.
 */
export const hasClient = (): boolean => {
  return isBonded(BOND_TYPE)
}
