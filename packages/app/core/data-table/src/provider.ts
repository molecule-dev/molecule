/**
 * Data table provider singleton.
 *
 * Bond packages call {@link setProvider} during application startup.
 * Application code calls {@link getProvider} or {@link createTable} at runtime.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import type { DataTableInstance, DataTableOptions, DataTableProvider } from './types.js'

/** Bond category key for the data table provider. */
const BOND_TYPE = 'data-table'

/**
 * Registers a data table provider as the active singleton. Called by bond
 * packages (e.g. `@molecule/app-data-table-tanstack`) during app startup.
 *
 * @param provider - The data table provider implementation to bond.
 */
export function setProvider(provider: DataTableProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded data table provider, throwing if none is configured.
 *
 * @returns The bonded data table provider.
 * @throws {Error} If no data table provider has been bonded.
 */
export function getProvider(): DataTableProvider {
  const provider = bondGet<DataTableProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      '@molecule/app-data-table: No provider bonded. Call setProvider() with a data table bond (e.g. @molecule/app-data-table-tanstack).',
    )
  }
  return provider
}

/**
 * Checks whether a data table provider is currently bonded.
 *
 * @returns `true` if a data table provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Creates a new data table instance using the bonded provider.
 *
 * @template T - The row data type.
 * @param options - Table configuration including data, columns, pagination, sorting, filtering, and selection.
 * @returns A data table instance for querying and mutating table state.
 * @throws {Error} If no data table provider has been bonded.
 */
export function createTable<T>(options: DataTableOptions<T>): DataTableInstance<T> {
  return getProvider().createTable(options)
}
