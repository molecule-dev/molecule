/**
 * Error tracking provider bond accessor.
 *
 * Bond packages (e.g. `@molecule/api-error-tracking-sentry`,
 * `@molecule/api-error-tracking-console`) call `setProvider()` during setup.
 * Application code uses the convenience functions from `error-tracking.ts`,
 * which silently no-op when no provider is bonded — error tracking is an
 * optional capability and reporting must never throw into the app.
 *
 * @module
 */

import { bond, get as bondGet, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { ErrorTrackingProvider } from './types.js'

const BOND_TYPE = 'error-tracking'
// Deliberately NOT `expectBond(BOND_TYPE)`: error tracking is optional by
// design. The default Express server imports this core unconditionally (its
// error middleware reports through `captureException`), so marking the bond
// as expected would make `validateBonds()` fail every app that hasn't wired
// an error tracker. Unbonded apps must keep booting; the convenience
// functions in `error-tracking.ts` no-op instead.

/**
 * Registers an error tracking provider as the active singleton. Called by
 * bond packages during application startup.
 *
 * @param provider - The error tracking provider implementation to bond.
 */
export const setProvider = (provider: ErrorTrackingProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded error tracking provider, throwing if none is
 * configured. Application code should normally use the never-throwing
 * convenience functions (`captureException`/`captureMessage`) or
 * `getOptionalProvider()` instead.
 *
 * @returns The bonded error tracking provider.
 * @throws {Error} If no error tracking provider has been bonded.
 */
export const getProvider = (): ErrorTrackingProvider => {
  try {
    return bondRequire<ErrorTrackingProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      t('errorTracking.error.noProvider', undefined, {
        defaultValue: 'Error tracking provider not configured. Call setProvider() first.',
      }),
      { cause: error },
    )
  }
}

/**
 * Checks whether an error tracking provider is currently bonded.
 *
 * @returns `true` if an error tracking provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded error tracking provider, returning `null` if none is
 * bonded. Prefer this over `getProvider()` in optional reporting code paths.
 *
 * @returns The bonded error tracking provider, or `null`.
 */
export const getOptionalProvider = (): ErrorTrackingProvider | null => {
  return bondGet<ErrorTrackingProvider>(BOND_TYPE) ?? null
}
