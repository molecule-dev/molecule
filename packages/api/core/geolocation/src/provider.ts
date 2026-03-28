/**
 * Geolocation provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-geolocation-google`) call `setProvider()` during setup.
 * Application code uses the convenience functions which delegate to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  AutocompleteOptions,
  DistanceUnit,
  GeolocationProvider,
  GeoResult,
  LatLng,
  PlaceSuggestion,
  TimezoneInfo,
} from './types.js'

const BOND_TYPE = 'geolocation'
expectBond(BOND_TYPE)

/**
 * Registers a geolocation provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The geolocation provider implementation to bond.
 */
export const setProvider = (provider: GeolocationProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded geolocation provider, throwing if none is configured.
 *
 * @returns The bonded geolocation provider.
 * @throws {Error} If no geolocation provider has been bonded.
 */
export const getProvider = (): GeolocationProvider => {
  try {
    return bondRequire<GeolocationProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('geolocation.error.noProvider', undefined, {
        defaultValue: 'Geolocation provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a geolocation provider is currently bonded.
 *
 * @returns `true` if a geolocation provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Converts a street address or place name to geographic coordinates.
 *
 * @param address - The address or place name to geocode.
 * @returns An array of matching results, ordered by relevance.
 * @throws {Error} If no geolocation provider has been bonded.
 */
export const geocode = async (address: string): Promise<GeoResult[]> => {
  return getProvider().geocode(address)
}

/**
 * Converts geographic coordinates to a human-readable address.
 *
 * @param lat - Latitude in decimal degrees.
 * @param lng - Longitude in decimal degrees.
 * @returns An array of matching address results, ordered by specificity.
 * @throws {Error} If no geolocation provider has been bonded.
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<GeoResult[]> => {
  return getProvider().reverseGeocode(lat, lng)
}

/**
 * Calculates the great-circle distance between two points using the Haversine formula.
 *
 * @param from - The starting coordinate.
 * @param to - The ending coordinate.
 * @param unit - The unit of measurement. Defaults to `'km'`.
 * @returns The distance between the two points.
 * @throws {Error} If no geolocation provider has been bonded.
 */
export const distance = (from: LatLng, to: LatLng, unit?: DistanceUnit): number => {
  return getProvider().distance(from, to, unit)
}

/**
 * Returns place suggestions for a partial query string (typeahead).
 *
 * @param query - The partial query string.
 * @param options - Options to bias or restrict results.
 * @returns An array of place suggestions.
 * @throws {Error} If no geolocation provider has been bonded or the provider does not support autocomplete.
 */
export const autocomplete = async (
  query: string,
  options?: AutocompleteOptions,
): Promise<PlaceSuggestion[]> => {
  const provider = getProvider()
  if (!provider.autocomplete) {
    throw new Error(
      t('geolocation.error.autocompleteNotSupported', undefined, {
        defaultValue: 'The bonded geolocation provider does not support autocomplete.',
      }),
    )
  }
  return provider.autocomplete(query, options)
}

/**
 * Returns timezone information for a geographic coordinate.
 *
 * @param lat - Latitude in decimal degrees.
 * @param lng - Longitude in decimal degrees.
 * @returns Timezone information for the location.
 * @throws {Error} If no geolocation provider has been bonded or the provider does not support timezone lookups.
 */
export const getTimezone = async (lat: number, lng: number): Promise<TimezoneInfo> => {
  const provider = getProvider()
  if (!provider.getTimezone) {
    throw new Error(
      t('geolocation.error.getTimezoneNotSupported', undefined, {
        defaultValue: 'The bonded geolocation provider does not support timezone lookups.',
      }),
    )
  }
  return provider.getTimezone(lat, lng)
}
