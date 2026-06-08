/**
 * Hotels provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-hotels-amadeus`,
 * `@molecule/api-hotels-booking-affiliate`,
 * `@molecule/api-hotels-expedia-rapid`) call `setProvider()` during
 * application startup. Application code uses the convenience functions
 * (`searchHotels`, `getHotelOffers`, `bookHotel`) which delegate to the
 * bonded provider via `@molecule/api-bond`.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  HotelBooking,
  HotelGuestInfo,
  HotelId,
  HotelOffer,
  HotelOfferId,
  HotelOffersCriteria,
  HotelSearchCriteria,
  HotelSearchResult,
  HotelsProvider,
} from './types.js'

const BOND_TYPE = 'hotels'
expectBond(BOND_TYPE)

/**
 * Registers a hotels provider as the active singleton. Called by bond
 * packages (e.g. `@molecule/api-hotels-amadeus`) during application
 * startup.
 *
 * @param provider - The hotels provider implementation to bond.
 */
export const setProvider = (provider: HotelsProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded hotels provider, throwing if none is configured.
 *
 * @returns The bonded hotels provider.
 * @throws {Error} If no hotels provider has been bonded.
 */
export const getProvider = (): HotelsProvider => {
  try {
    return bondRequire<HotelsProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      t('hotels.error.noProvider', undefined, {
        defaultValue: 'Hotels provider not configured. Call setProvider() first.',
      }),
      { cause: error },
    )
  }
}

/**
 * Checks whether a hotels provider is currently bonded.
 *
 * @returns `true` if a hotels provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Searches available hotels matching {@link criteria} using the bonded
 * provider.
 *
 * @param criteria - Search criteria (location + dates + room demand).
 * @returns Array of {@link HotelSearchResult}, possibly empty.
 * @throws {Error} If no hotels provider has been bonded.
 */
export const searchHotels = async (criteria: HotelSearchCriteria): Promise<HotelSearchResult[]> => {
  return getProvider().searchHotels(criteria)
}

/**
 * Returns priced offers for {@link hotelId} using the bonded provider.
 * Offers are short-lived and should be re-fetched immediately before a
 * booking flow.
 *
 * @param hotelId - Provider-issued hotel identifier.
 * @param criteria - Date + occupancy filter.
 * @returns Array of {@link HotelOffer}, possibly empty.
 * @throws {Error} If no hotels provider has been bonded.
 */
export const getHotelOffers = async (
  hotelId: HotelId,
  criteria: HotelOffersCriteria,
): Promise<HotelOffer[]> => {
  return getProvider().getHotelOffers(hotelId, criteria)
}

/**
 * Confirms a hotel booking against {@link offerId} using the bonded
 * provider.
 *
 * Providers that only support priced offers + provider-hosted checkout
 * MAY throw with `cause.code === 'BOOKING_NOT_SUPPORTED'`; callers can
 * detect that and fall back to a redirect flow.
 *
 * @param offerId - Offer to confirm. Must be fresh (not expired).
 * @param guestInfo - Lead guest contact / identity details.
 * @returns Confirmed {@link HotelBooking} record.
 * @throws {Error} If no hotels provider has been bonded, or the
 *   provider does not support direct API booking.
 */
export const bookHotel = async (
  offerId: HotelOfferId,
  guestInfo: HotelGuestInfo,
): Promise<HotelBooking> => {
  return getProvider().bookHotel(offerId, guestInfo)
}
