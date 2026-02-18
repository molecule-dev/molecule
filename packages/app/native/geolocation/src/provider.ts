/**
 * Geolocation provider management for molecule.dev.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import type { GeolocationProvider } from './types.js'
import { createWebGeolocationProvider } from './web-provider.js'

const BOND_TYPE = 'geolocation'

/**
 * Sets the geolocation provider implementation.
 * @param provider - The provider implementation.
 */
export const setProvider = (provider: GeolocationProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Gets the current geolocation provider, falling back to the web implementation.
 * @returns The active geolocation provider instance.
 */
export const getProvider = (): GeolocationProvider => {
  if (!isBonded(BOND_TYPE)) {
    bond(BOND_TYPE, createWebGeolocationProvider())
  }
  return bondGet<GeolocationProvider>(BOND_TYPE)!
}

/**
 * Checks if a geolocation provider has been bonded.
 * @returns Whether a geolocation provider is currently registered.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}
