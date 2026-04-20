/**
 * Audit provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-audit-database`) call `setProvider()`
 * during setup. Application code uses the convenience functions which delegate
 * to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  AuditEntry,
  AuditExportFormat,
  AuditProvider,
  AuditQuery,
  AuditRecord,
  PaginatedResult,
} from './types.js'

const BOND_TYPE = 'audit'
expectBond(BOND_TYPE)

/**
 * Registers an audit provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The audit provider implementation to bond.
 */
export const setProvider = (provider: AuditProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded audit provider, throwing if none is configured.
 *
 * @returns The bonded audit provider.
 * @throws {Error} If no audit provider has been bonded.
 */
export const getProvider = (): AuditProvider => {
  try {
    return bondRequire<AuditProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('audit.error.noProvider', undefined, {
        defaultValue: 'Audit provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether an audit provider is currently bonded.
 *
 * @returns `true` if an audit provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Records an audit trail entry.
 *
 * @param entry - The audit entry to record.
 * @returns Resolves when the bonded provider persists the entry.
 * @throws {Error} If no audit provider has been bonded.
 */
export const log = async (entry: AuditEntry): Promise<void> => {
  return getProvider().log(entry)
}

/**
 * Queries audit records with optional filtering and pagination.
 *
 * @param options - Query filters and pagination options.
 * @returns A paginated result set of audit records.
 * @throws {Error} If no audit provider has been bonded.
 */
export const query = async (options: AuditQuery): Promise<PaginatedResult<AuditRecord>> => {
  return getProvider().query(options)
}

/**
 * Exports audit records matching the query in the specified format.
 *
 * @param options - Query filters for the records to export.
 * @param format - The export format (`csv` or `json`).
 * @returns A `Buffer` containing the exported data.
 * @throws {Error} If no audit provider has been bonded.
 */
export const auditExport = async (
  options: AuditQuery,
  format: AuditExportFormat,
): Promise<Buffer> => {
  return getProvider().export(options, format)
}
