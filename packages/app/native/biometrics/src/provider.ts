/**
 * `@molecule/app-biometrics`
 * Provider management for biometrics module.
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import type {
  AuthenticateOptions,
  AuthenticateResult,
  BiometricAvailability,
  BiometricsProvider,
  BiometricType,
} from './types.js'
import { createWebAuthnProvider } from './webauthn.js'

const BOND_TYPE = 'biometrics'

/**
 * Sets the biometrics provider implementation.
 * @param provider - The provider implementation.
 */
export const setProvider = (provider: BiometricsProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Gets the current biometrics provider. Falls back to a WebAuthn-based provider if none is set.
 * @returns The active BiometricsProvider instance.
 */
export const getProvider = (): BiometricsProvider => {
  if (!isBonded(BOND_TYPE)) {
    bond(BOND_TYPE, createWebAuthnProvider())
  }
  return bondGet<BiometricsProvider>(BOND_TYPE)!
}

/**
 * Checks if a biometrics provider has been registered.
 * @returns Whether a BiometricsProvider has been bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Checks biometric availability on the device.
 * @returns The availability status including biometric type, enrollment, and failure reason.
 */
export const checkAvailability = (): Promise<BiometricAvailability> =>
  getProvider().checkAvailability()

/**
 * Authenticates the user with biometrics.
 * @param options - Authentication prompt configuration (reason, title, fallback settings).
 * @returns The authentication result indicating success or error details.
 */
export const authenticate = (options: AuthenticateOptions): Promise<AuthenticateResult> =>
  getProvider().authenticate(options)

/**
 * Checks if the device has a secure lock screen (PIN, password, or biometric).
 * @returns Whether the device is secure.
 */
export const isDeviceSecure = (): Promise<boolean> => getProvider().isDeviceSecure()

/**
 * Gets the primary biometric type available on the device.
 * @returns The biometric type: 'fingerprint', 'face', 'iris', or 'none'.
 */
export const getBiometricType = (): Promise<BiometricType> => getProvider().getBiometricType()
