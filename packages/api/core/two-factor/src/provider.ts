/**
 * Two-factor authentication bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-two-factor-otplib`) call `setProvider()`
 * during setup. Application code uses `generateSecret()`, `getUrls()`, and
 * `verify()` directly.
 *
 * @module
 */

import { bond, isBonded, require as bondRequire } from '@molecule/api-bond'

import type {
  TwoFactorProvider,
  TwoFactorUrlParams,
  TwoFactorUrls,
  TwoFactorVerifyParams,
} from './types.js'

const BOND_TYPE = 'two-factor'

/**
 * Registers a two-factor authentication provider as the active singleton.
 * Called by bond packages during application startup.
 *
 * @param provider - The two-factor authentication provider implementation to bond.
 */
export const setProvider = (provider: TwoFactorProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded two-factor provider, throwing if none is configured.
 *
 * @returns The bonded two-factor authentication provider.
 * @throws {Error} If no two-factor provider has been bonded.
 */
export const getProvider = (): TwoFactorProvider => {
  return bondRequire<TwoFactorProvider>(BOND_TYPE)
}

/**
 * Checks whether a two-factor authentication provider is currently bonded.
 *
 * @returns `true` if a two-factor provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Generates a new TOTP secret string using the bonded provider.
 *
 * @returns A base32-encoded TOTP secret.
 */
export const generateSecret = (): string => getProvider().generateSecret()

/**
 * Generates an `otpauth://` key URI and a QR code image URL for TOTP
 * enrollment using the bonded provider.
 *
 * @param params - The URL parameters including username, service name, and secret.
 * @returns An object containing `keyUrl` (otpauth URI) and `QRImageUrl` (data URL).
 */
export const getUrls = (params: TwoFactorUrlParams): Promise<TwoFactorUrls> =>
  getProvider().getUrls(params)

/**
 * Verifies a TOTP token against a secret using the bonded provider.
 *
 * @param params - The verification parameters containing the secret and token.
 * @returns `true` if the token is valid for the given secret.
 */
export const verify = (params: TwoFactorVerifyParams): Promise<boolean> =>
  getProvider().verify(params)
