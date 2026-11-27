/**
 * Shares the file picker provider with the app's bond registry.
 *
 * @module
 */

import { bond, get, isBonded } from '@molecule/app-bond'

import type { FilePickerProvider } from './types.js'

const BOND_TYPE = 'file-picker'

/**
 * Registers the app's file picker provider.
 *
 * @param provider - The provider to bond.
 */
export function setProvider(provider: FilePickerProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Gets the app's bonded file picker.
 *
 * @returns The bonded provider, or null before one is configured.
 */
export function getProvider(): FilePickerProvider | null {
  return get<FilePickerProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether the app has a file picker provider.
 *
 * @returns Whether a provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}
