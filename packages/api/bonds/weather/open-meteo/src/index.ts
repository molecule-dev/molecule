/**
 * Open-Meteo weather provider for molecule.dev.
 *
 * Implements the `WeatherProvider` interface against the public Open-Meteo
 * forecast endpoint (`https://api.open-meteo.com/v1/forecast`), which is
 * keyless, free for non-commercial use, and emits WMO 4677 weather codes
 * directly. Open-Meteo's native units (Celsius, mm, km/h, percent) already
 * match the core interface, so the provider performs a structural reshape
 * rather than a unit conversion.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-weather'
 * import { provider } from '@molecule/api-weather-open-meteo'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
