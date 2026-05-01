/**
 * Travel trip-planning provider bond accessor and convenience
 * functions.
 *
 * Bond packages (e.g. `@molecule/api-travel-amadeus`) call
 * `setProvider()` during application startup. Application code uses the
 * convenience functions (`searchTripOptions`, `searchActivities`,
 * `searchCars`) which delegate to the bonded provider via
 * `@molecule/api-bond`.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  ActivityOffer,
  CarOffer,
  SearchActivitiesOptions,
  SearchCarsOptions,
  SearchTripOptions,
  TravelProvider,
  TripSearchResult,
} from './types.js'

const BOND_TYPE = 'travel'
expectBond(BOND_TYPE)

/**
 * Registers a travel provider as the active singleton. Called by bond
 * packages (e.g. `@molecule/api-travel-amadeus`) during application
 * startup.
 *
 * @param provider - The travel provider implementation to bond.
 */
export const setProvider = (provider: TravelProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded travel provider, throwing if none is configured.
 *
 * @returns The bonded travel provider.
 * @throws {Error} If no travel provider has been bonded.
 */
export const getProvider = (): TravelProvider => {
  try {
    return bondRequire<TravelProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('travel.error.noProvider', undefined, {
        defaultValue: 'Travel provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a travel provider is currently bonded.
 *
 * @returns `true` if a travel provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Searches for trip options (flights + hotels + cars + activities)
 * using the bonded provider.
 *
 * @param options - Trip search criteria.
 * @returns Aggregated trip search result.
 * @throws {Error} If no travel provider has been bonded.
 */
export const searchTripOptions = async (options: SearchTripOptions): Promise<TripSearchResult> => {
  return getProvider().searchTripOptions(options)
}

/**
 * Searches for activity / experience offers at a destination using the
 * bonded provider.
 *
 * @param options - Activity search criteria.
 * @returns Array of normalized activity offers, possibly empty.
 * @throws {Error} If no travel provider has been bonded.
 */
export const searchActivities = async (
  options: SearchActivitiesOptions,
): Promise<ActivityOffer[]> => {
  return getProvider().searchActivities(options)
}

/**
 * Searches for car-rental offers using the bonded provider.
 *
 * Providers without a car-rental API return an empty array rather
 * than throwing.
 *
 * @param options - Car-rental search criteria.
 * @returns Array of normalized car-rental offers, possibly empty.
 * @throws {Error} If no travel provider has been bonded.
 */
export const searchCars = async (options: SearchCarsOptions): Promise<CarOffer[]> => {
  return getProvider().searchCars(options)
}
