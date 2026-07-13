/**
 * Password hashing bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-password-bcrypt`) call `setProvider()`
 * during setup. Application code uses `hash()` and `compare()` directly.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'

import type { PasswordProvider } from './types.js'

const BOND_TYPE = 'password'
expectBond(BOND_TYPE)

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
 * The env-derived default is clamped to a sane bcrypt-cost range of 10–16
 * (mirroring `@molecule/api-password-bcrypt`'s own default): the cost factor
 * is EXPONENTIAL (each +1 doubles the work), so a misread `SALT_ROUNDS=32`
 * would otherwise hang every signup for hours with zero error output, and
 * `SALT_ROUNDS=4` would silently produce weak hashes. An explicitly passed
 * `saltRounds` argument is honored as-is (a deliberate caller choice, e.g.
 * fast test fixtures).
 *
 * @param saltRounds - Number of salt rounds (cost factor); defaults to the `SALT_ROUNDS` env var (clamped to 10–16) or 12.
 * @returns The resulting password hash string.
 * @throws {Error} If no password provider has been bonded.
 */
export const hash = (
  password: string,
  saltRounds: number = Math.min(Math.max(Number(process.env.SALT_ROUNDS) || 12, 10), 16),
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
