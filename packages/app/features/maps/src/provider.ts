/**
 * Map provider management for molecule.dev.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import { createSimpleMapProvider } from './map.js'
import type { MapConfig, MapInstance, MapProvider } from './types.js'

const BOND_TYPE = 'maps'

/**
 * Set the map provider.
 * @param provider - MapProvider implementation to register.
 */
export const setProvider = (provider: MapProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Get the current map provider. Falls back to a simple placeholder
 * provider if none has been explicitly set.
 * @returns The active MapProvider instance.
 */
export const getProvider = (): MapProvider => {
  if (!isBonded(BOND_TYPE)) {
    bond(BOND_TYPE, createSimpleMapProvider())
  }
  return bondGet<MapProvider>(BOND_TYPE)!
}

/**
 * Check if a map provider has been registered.
 * @returns Whether a MapProvider has been bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Create a new map instance using the current provider.
 * @param config - Map configuration (container element, center, zoom, style, etc.).
 * @returns A MapInstance for controlling the map.
 */
export const createMap = (config: MapConfig): MapInstance | Promise<MapInstance> => {
  return getProvider().createMap(config)
}
