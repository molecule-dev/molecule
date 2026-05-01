/**
 * Flights provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-flights-amadeus`) call
 * `setProvider()` during application startup. Application code uses the
 * convenience functions (`searchFlights`, `getOffer`, `priceOffer`) which
 * delegate to the bonded provider via `@molecule/api-bond`.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  FlightOffer,
  FlightOfferDetail,
  FlightsProvider,
  OfferId,
  PricingResult,
  SearchFlightsOptions,
} from './types.js'

const BOND_TYPE = 'flights'
expectBond(BOND_TYPE)

/**
 * Registers a flights provider as the active singleton. Called by bond
 * packages (e.g. `@molecule/api-flights-amadeus`) during application
 * startup.
 *
 * @param provider - The flights provider implementation to bond.
 */
export const setProvider = (provider: FlightsProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded flights provider, throwing if none is configured.
 *
 * @returns The bonded flights provider.
 * @throws {Error} If no flights provider has been bonded.
 */
export const getProvider = (): FlightsProvider => {
  try {
    return bondRequire<FlightsProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('flights.error.noProvider', undefined, {
        defaultValue: 'Flights provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a flights provider is currently bonded.
 *
 * @returns `true` if a flights provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Searches for flight offers matching the supplied itinerary.
 *
 * @param options - Search parameters (origin, destination, dates,
 *   passenger counts, cabin, etc.).
 * @returns Array of normalized flight offers.
 * @throws {Error} If no flights provider has been bonded.
 */
export const searchFlights = async (options: SearchFlightsOptions): Promise<FlightOffer[]> => {
  return getProvider().searchFlights(options)
}

/**
 * Retrieves a previously-searched offer in detail.
 *
 * @param offerId - Opaque offer identifier returned by `searchFlights`.
 * @returns The offer with per-passenger price breakdown when available.
 * @throws {Error} If no flights provider has been bonded.
 */
export const getOffer = async (offerId: OfferId): Promise<FlightOfferDetail> => {
  return getProvider().getOffer(offerId)
}

/**
 * Confirms the up-to-the-minute price for a previously-searched offer.
 *
 * @param offerId - Opaque offer identifier returned by `searchFlights`.
 * @returns Authoritative price snapshot.
 * @throws {Error} If no flights provider has been bonded.
 */
export const priceOffer = async (offerId: OfferId): Promise<PricingResult> => {
  return getProvider().priceOffer(offerId)
}
