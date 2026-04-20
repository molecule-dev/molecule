/**
 * Compliance provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-compliance-gdpr`) call `setProvider()`
 * during setup. Application code uses the convenience functions which
 * delegate to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  ComplianceProvider,
  ConsentRecord,
  ConsentUpdate,
  DeletionOptions,
  DeletionResult,
  ExportFormat,
  ProcessingLogEntry,
  UserDataExport,
} from './types.js'

const BOND_TYPE = 'compliance'
expectBond(BOND_TYPE)

/**
 * Registers a compliance provider as the active singleton. Called by
 * bond packages during application startup.
 *
 * @param provider - The compliance provider implementation to bond.
 */
export const setProvider = (provider: ComplianceProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded compliance provider, throwing if none is configured.
 *
 * @returns The bonded compliance provider.
 * @throws {Error} If no compliance provider has been bonded.
 */
export const getProvider = (): ComplianceProvider => {
  try {
    return bondRequire<ComplianceProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('compliance.error.noProvider', undefined, {
        defaultValue: 'Compliance provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a compliance provider is currently bonded.
 *
 * @returns `true` if a compliance provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Exports all data associated with a user using the bonded provider.
 *
 * @param userId - The identifier of the user whose data to export.
 * @param format - The export format (defaults to 'json').
 * @returns The exported user data package.
 * @throws {Error} If no compliance provider has been bonded.
 */
export const exportUserData = async (
  userId: string,
  format?: ExportFormat,
): Promise<UserDataExport> => {
  return getProvider().exportUserData(userId, format)
}

/**
 * Deletes user data using the bonded provider.
 *
 * @param userId - The identifier of the user whose data to delete.
 * @param options - Optional deletion parameters.
 * @returns The result of the deletion request.
 * @throws {Error} If no compliance provider has been bonded.
 */
export const deleteUserData = async (
  userId: string,
  options?: DeletionOptions,
): Promise<DeletionResult> => {
  return getProvider().deleteUserData(userId, options)
}

/**
 * Retrieves the current consent record for a user using the bonded provider.
 *
 * @param userId - The identifier of the user.
 * @returns The user's consent record.
 * @throws {Error} If no compliance provider has been bonded.
 */
export const getConsent = async (userId: string): Promise<ConsentRecord> => {
  return getProvider().getConsent(userId)
}

/**
 * Updates consent for a specific data processing purpose using the bonded provider.
 *
 * @param userId - The identifier of the user.
 * @param consent - The consent update to apply.
 * @returns Resolves when the bonded provider applies the update.
 * @throws {Error} If no compliance provider has been bonded.
 */
export const setConsent = async (userId: string, consent: ConsentUpdate): Promise<void> => {
  return getProvider().setConsent(userId, consent)
}

/**
 * Retrieves the data processing log for a user using the bonded provider.
 *
 * @param userId - The identifier of the user.
 * @returns Array of processing log entries.
 * @throws {Error} If no compliance provider has been bonded.
 */
export const getDataProcessingLog = async (userId: string): Promise<ProcessingLogEntry[]> => {
  return getProvider().getDataProcessingLog(userId)
}
