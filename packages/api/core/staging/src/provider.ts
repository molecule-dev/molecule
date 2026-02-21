/**
 * Staging driver bond accessor functions.
 *
 * Bond packages (e.g. `@molecule/api-staging-docker-compose`) call `setProvider()`
 * during setup. CLI commands use the typed accessors to delegate lifecycle operations
 * to the bonded driver.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/api-bond'

import type { StagingDriver } from './types.js'

const BOND_TYPE = 'staging'

/**
 * Registers a staging driver as the active singleton.
 * Called by driver packages during application startup.
 *
 * @param driver - The staging driver implementation to bond.
 */
export const setProvider = (driver: StagingDriver): void => {
  bond(BOND_TYPE, driver)
}

/**
 * Retrieves the bonded staging driver, or `null` if none is bonded.
 *
 * @returns The bonded staging driver, or `null`.
 */
export const getProvider = (): StagingDriver | null => {
  return bondGet<StagingDriver>(BOND_TYPE) ?? null
}

/**
 * Checks whether a staging driver is currently bonded.
 *
 * @returns `true` if a staging driver is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}
