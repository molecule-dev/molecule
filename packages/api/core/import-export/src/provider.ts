/**
 * ImportExport provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-import-export-csv`) call `setProvider()` during setup.
 * Application code uses the convenience functions which delegate to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  ExportQuery,
  ImportExportProvider,
  ImportJobStatus,
  ImportOptions,
  ImportResult,
} from './types.js'

const BOND_TYPE = 'import-export'
expectBond(BOND_TYPE)

/**
 * Registers an import/export provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The import/export provider implementation to bond.
 */
export const setProvider = (provider: ImportExportProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded import/export provider, throwing if none is configured.
 *
 * @returns The bonded import/export provider.
 * @throws {Error} If no import/export provider has been bonded.
 */
export const getProvider = (): ImportExportProvider => {
  try {
    return bondRequire<ImportExportProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('importExport.error.noProvider', undefined, {
        defaultValue: 'ImportExport provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether an import/export provider is currently bonded.
 *
 * @returns `true` if an import/export provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Imports CSV data into the specified table.
 *
 * @param table - Target table name.
 * @param data - CSV data as a Buffer or ReadableStream.
 * @param options - Import options (mapping, dedup, batching, validation).
 * @returns The import result with row counts and any errors.
 * @throws {Error} If no import/export provider has been bonded.
 */
export const importCSV = async (
  table: string,
  data: Buffer | ReadableStream,
  options?: ImportOptions,
): Promise<ImportResult> => {
  return getProvider().importCSV(table, data, options)
}

/**
 * Imports JSON data into the specified table.
 *
 * @param table - Target table name.
 * @param data - Array of objects to import.
 * @param options - Import options (mapping, dedup, batching, validation).
 * @returns The import result with row counts and any errors.
 * @throws {Error} If no import/export provider has been bonded.
 */
export const importJSON = async (
  table: string,
  data: unknown[],
  options?: ImportOptions,
): Promise<ImportResult> => {
  return getProvider().importJSON(table, data, options)
}

/**
 * Exports table data as CSV.
 *
 * @param table - Source table name.
 * @param query - Optional filters, column selection, ordering, and limit.
 * @returns A Buffer containing the CSV data.
 * @throws {Error} If no import/export provider has been bonded.
 */
export const exportCSV = async (table: string, query?: ExportQuery): Promise<Buffer> => {
  return getProvider().exportCSV(table, query)
}

/**
 * Exports table data as JSON.
 *
 * @param table - Source table name.
 * @param query - Optional filters, column selection, ordering, and limit.
 * @returns An array of row objects.
 * @throws {Error} If no import/export provider has been bonded.
 */
export const exportJSON = async (table: string, query?: ExportQuery): Promise<unknown[]> => {
  return getProvider().exportJSON(table, query)
}

/**
 * Exports table data as an Excel file.
 *
 * @param table - Source table name.
 * @param query - Optional filters, column selection, ordering, and limit.
 * @returns A Buffer containing the Excel file data.
 * @throws {Error} If no import/export provider has been bonded.
 */
export const exportExcel = async (table: string, query?: ExportQuery): Promise<Buffer> => {
  return getProvider().exportExcel(table, query)
}

/**
 * Retrieves the status of an import job.
 *
 * @param jobId - The unique identifier of the import job.
 * @returns The current status of the job.
 * @throws {Error} If no import/export provider has been bonded.
 */
export const getJobStatus = async (jobId: string): Promise<ImportJobStatus> => {
  return getProvider().getJobStatus(jobId)
}
