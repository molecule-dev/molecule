/**
 * Drug-database provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-drug-database-rxnorm`) call
 * {@link setProvider} during application startup. Application code uses
 * the convenience functions ({@link searchDrug}, {@link getDrug},
 * {@link checkInteractions}, {@link getNDCs}) which delegate to the
 * bonded provider via `@molecule/api-bond`.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  DrugDatabaseProvider,
  DrugDetail,
  DrugId,
  DrugInteraction,
  DrugMatch,
} from './types.js'

const BOND_TYPE = 'drug-database'
expectBond(BOND_TYPE)

/**
 * Registers a drug-database provider as the active singleton.
 *
 * Called by bond packages (e.g. `@molecule/api-drug-database-rxnorm`)
 * during application startup.
 *
 * @param provider - The drug-database provider implementation to bond.
 */
export const setProvider = (provider: DrugDatabaseProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded drug-database provider, throwing if none is
 * configured.
 *
 * @returns The bonded drug-database provider.
 * @throws {Error} If no drug-database provider has been bonded.
 */
export const getProvider = (): DrugDatabaseProvider => {
  try {
    return bondRequire<DrugDatabaseProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('drugDatabase.error.noProvider', undefined, {
        defaultValue: 'Drug-database provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a drug-database provider is currently bonded.
 *
 * @returns `true` if a drug-database provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Free-text search for drugs via the bonded provider.
 *
 * @param query - Free-text query (drug name).
 * @returns Array of normalized search-result rows, ordered by upstream
 *   relevance.
 * @throws {Error} If no drug-database provider has been bonded.
 */
export const searchDrug = async (query: string): Promise<DrugMatch[]> => {
  return getProvider().searchDrug(query)
}

/**
 * Look up a drug by provider-specific id via the bonded provider.
 *
 * @param id - Provider-specific identifier previously returned by
 *   {@link searchDrug}.
 * @returns The matching drug detail, or `null` when no record exists.
 * @throws {Error} If no drug-database provider has been bonded.
 */
export const getDrug = async (id: DrugId): Promise<DrugDetail | null> => {
  return getProvider().getDrug(id)
}

/**
 * Check for known interactions between the supplied drug ids via the
 * bonded provider.
 *
 * Empty array means "no interactions reported by this provider", NOT a
 * clinical guarantee — see {@link DrugInteraction} for the contract.
 *
 * @param drugIds - Provider-specific ids previously returned by
 *   {@link searchDrug}.
 * @returns Array of reported interactions.
 * @throws {Error} If no drug-database provider has been bonded.
 */
export const checkInteractions = async (drugIds: DrugId[]): Promise<DrugInteraction[]> => {
  return getProvider().checkInteractions(drugIds)
}

/**
 * Enumerate the National Drug Code (NDC) identifiers associated with a
 * drug via the bonded provider.
 *
 * @param drugId - Provider-specific identifier previously returned by
 *   {@link searchDrug}.
 * @returns Array of NDC strings.
 * @throws {Error} If no drug-database provider has been bonded.
 */
export const getNDCs = async (drugId: DrugId): Promise<string[]> => {
  return getProvider().getNDCs(drugId)
}
