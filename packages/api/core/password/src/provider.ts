/**
 * Password hashing bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-password-bcrypt`) call `setProvider()`
 * during setup. Application code uses `hash()` and `compare()` directly.
 *
 * @module
 */

import { bond, isBonded, require as bondRequire } from '@molecule/api-bond'

import type { PasswordProvider } from './types.js'

const BOND_TYPE = 'password'

/**
 * Registers a password hashing provider as the active singleton. Called by
 * bond packages during application startup.
 *
 * @param provider - The password hashing provider implementation to bond.
 */
export const setProvider = (provider: PasswordProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded password provider, throwing if none is configured.
 *
 * @returns The bonded password provider.
 * @throws {Error} If no password provider has been bonded.
 */
export const getProvider = (): PasswordProvider => {
  return bondRequire<PasswordProvider>(BOND_TYPE)
}

/**
 * Checks whether a password provider is currently bonded.
 *
 * @returns `true` if a password provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Hashes a plain-text password using the bonded provider.
 *
 * @param password - The plain-text password to hash.
 * @param saltRounds - Number of salt rounds (cost factor); defaults to the `SALT_ROUNDS` env var or 10.
 * @returns The resulting password hash string.
 * @throws {Error} If no password provider has been bonded.
 */
export const hash = (
  password: string,
  saltRounds: number = Number(process.env.SALT_ROUNDS) || 10,
): Promise<string> => {
  return getProvider().hash(password, saltRounds)
}

/**
 * Compares a plain-text password against a stored hash using the bonded provider.
 *
 * @param password - The plain-text password to check.
 * @param passwordHash - The stored hash to compare against.
 * @returns `true` if the password matches the hash.
 * @throws {Error} If no password provider has been bonded.
 */
export const compare = (password: string, passwordHash: string): Promise<boolean> => {
  return getProvider().compare(password, passwordHash)
}
