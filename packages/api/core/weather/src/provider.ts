/**
 * Weather provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-weather-open-meteo`) call `setProvider()`
 * during application startup. Application code uses the convenience functions
 * (`getCurrent`, `getForecast`, `getHourly`) which delegate to the bonded
 * provider via `@molecule/api-bond`.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  CurrentWeather,
  DailyForecast,
  HourlyForecast,
  WeatherLocation,
  WeatherProvider,
} from './types.js'

const BOND_TYPE = 'weather'
expectBond(BOND_TYPE)

/**
 * Registers a weather provider as the active singleton. Called by bond
 * packages (e.g. `@molecule/api-weather-open-meteo`) during application
 * startup.
 *
 * @param provider - The weather provider implementation to bond.
 */
export const setProvider = (provider: WeatherProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded weather provider, throwing if none is configured.
 *
 * @returns The bonded weather provider.
 * @throws {Error} If no weather provider has been bonded.
 */
export const getProvider = (): WeatherProvider => {
  try {
    return bondRequire<WeatherProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      t('weather.error.noProvider', undefined, {
        defaultValue: 'Weather provider not configured. Call setProvider() first.',
      }),
      { cause: error },
    )
  }
}

/**
 * Checks whether a weather provider is currently bonded.
 *
 * @returns `true` if a weather provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Returns the current observed weather for a location, using the bonded
 * provider.
 *
 * @param location - Latitude/longitude (and optional timezone).
 * @returns Normalized current weather reading.
 * @throws {Error} If no weather provider has been bonded.
 */
export const getCurrent = async (location: WeatherLocation): Promise<CurrentWeather> => {
  return getProvider().getCurrent(location)
}

/**
 * Returns a daily forecast for a location, using the bonded provider.
 *
 * @param location - Latitude/longitude (and optional timezone).
 * @param days - Number of forecast days. Defaults to `7`.
 * @returns Array of normalized daily forecast entries.
 * @throws {Error} If no weather provider has been bonded.
 */
export const getForecast = async (
  location: WeatherLocation,
  days?: number,
): Promise<DailyForecast[]> => {
  return getProvider().getForecast(location, days)
}

/**
 * Returns an hourly forecast for a location, using the bonded provider.
 *
 * @param location - Latitude/longitude (and optional timezone).
 * @param hours - Number of forecast hours. Defaults to `24`.
 * @returns Array of normalized hourly forecast entries.
 * @throws {Error} If no weather provider has been bonded.
 */
export const getHourly = async (
  location: WeatherLocation,
  hours?: number,
): Promise<HourlyForecast[]> => {
  return getProvider().getHourly(location, hours)
}
