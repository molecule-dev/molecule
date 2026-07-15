# @molecule/api-weather

Provider-agnostic weather data interface for molecule.dev.

Defines the `WeatherProvider` interface for current observations, daily
forecasts, and hourly forecasts. Bond packages (Open-Meteo, OpenWeather,
NWS, etc.) implement this interface. Application code uses the convenience
functions (`getCurrent`, `getForecast`, `getHourly`) which delegate to the
bonded provider.

Values are normalized to metric units: temperature in degrees Celsius,
precipitation in millimetres, wind in kilometres per hour, humidity as
percent (0–100). Condition codes follow WMO 4677 — providers that speak
a different vocabulary MUST translate before returning.

## Quick Start

```typescript
import { setProvider, getCurrent, getForecast } from '@molecule/api-weather'
import { provider as openMeteo } from '@molecule/api-weather-open-meteo'

setProvider(openMeteo)
const now = await getCurrent({ lat: 40.7128, lon: -74.006 })
const week = await getForecast({ lat: 40.7128, lon: -74.006 }, 7)
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-weather @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `CurrentWeather`

A single point-in-time weather observation or forecast for a location.

Fields use SI / metric units (Celsius, mm, km/h, percent 0–100). Providers
MUST normalize their upstream payloads to these units before returning.

```typescript
interface CurrentWeather {
  /**
   * Time the observation/forecast applies to.
   */
  time: Date

  /**
   * Air temperature, degrees Celsius.
   */
  temperatureC: number

  /**
   * Apparent ("feels like") temperature, degrees Celsius.
   */
  feelsLikeC: number

  /**
   * Relative humidity, percent (0–100).
   */
  humidity: number

  /**
   * Liquid-equivalent precipitation accumulated over the reporting interval,
   * in millimetres.
   */
  precipitationMm: number

  /**
   * Wind reading.
   */
  wind: WindReading

  /**
   * Provider-agnostic numeric weather code (WMO 4677 where supported, e.g.
   * `0` = clear, `61` = light rain). Providers that don't speak WMO MUST
   * map their native codes onto WMO before returning.
   */
  code: number

  /**
   * Short, locale-neutral English summary derived from {@link code}
   * (e.g. `'Clear'`, `'Light rain'`). Localization is the consumer's
   * responsibility — the summary is intended as a developer-friendly
   * default, not a user-facing string.
   */
  summary: string
}
```

#### `DailyForecast`

Daily forecast entry (one row per forecast day).

Daily entries summarize the day, so temperatures are min/max and
precipitation is the day's total accumulation.

```typescript
interface DailyForecast {
  /**
   * Date the forecast applies to (00:00 in the location's timezone).
   */
  date: Date

  /**
   * Daily minimum air temperature, degrees Celsius.
   */
  temperatureMinC: number

  /**
   * Daily maximum air temperature, degrees Celsius.
   */
  temperatureMaxC: number

  /**
   * Daily minimum apparent temperature, degrees Celsius.
   */
  feelsLikeMinC: number

  /**
   * Daily maximum apparent temperature, degrees Celsius.
   */
  feelsLikeMaxC: number

  /**
   * Mean relative humidity for the day, percent (0–100). Providers that
   * don't expose a daily mean SHOULD compute one from the hourly values.
   */
  humidity: number

  /**
   * Total liquid-equivalent precipitation accumulated for the day, in
   * millimetres.
   */
  precipitationMm: number

  /**
   * Maximum wind reading observed (or forecast) for the day.
   */
  wind: WindReading

  /**
   * Provider-agnostic numeric weather code (WMO 4677). See
   * {@link CurrentWeather.code}.
   */
  code: number

  /**
   * Short English summary derived from {@link code}. See
   * {@link CurrentWeather.summary}.
   */
  summary: string
}
```

#### `WeatherLocation`

Geographic coordinate, expressed in decimal degrees (WGS 84).

```typescript
interface WeatherLocation {
  /**
   * Latitude in decimal degrees, positive north.
   */
  lat: number

  /**
   * Longitude in decimal degrees, positive east.
   */
  lon: number

  /**
   * Optional IANA timezone (e.g. `'America/New_York'`). Providers that
   * don't support timezone selection MAY ignore this. When omitted,
   * providers should default to UTC or the location's local timezone.
   */
  timezone?: string
}
```

#### `WeatherProvider`

Weather data provider interface.

All weather providers (Open-Meteo, OpenWeather, NWS, fixtures, etc.)
implement this interface. The interface is intentionally minimal so
providers with different upstream APIs can satisfy it identically.

Providers MUST normalize all returned values to metric units (Celsius,
mm, km/h, percent 0–100) and MUST map upstream condition codes onto
WMO 4677 numeric codes.

```typescript
interface WeatherProvider {
  /**
   * Returns the current observed weather for a location.
   *
   * @param location - Latitude/longitude (and optional timezone).
   * @returns Normalized {@link CurrentWeather} reading.
   */
  getCurrent(location: WeatherLocation): Promise<CurrentWeather>

  /**
   * Returns a daily forecast for a location.
   *
   * @param location - Latitude/longitude (and optional timezone).
   * @param days - Number of forecast days, including today. Implementations
   *   MAY clamp to whatever range their upstream supports. Defaults to `7`.
   * @returns Array of normalized {@link DailyForecast} entries, ordered
   *   ascending by date.
   */
  getForecast(location: WeatherLocation, days?: number): Promise<DailyForecast[]>

  /**
   * Returns an hourly forecast for a location.
   *
   * @param location - Latitude/longitude (and optional timezone).
   * @param hours - Number of forecast hours, starting from the current hour.
   *   Implementations MAY clamp to whatever range their upstream supports.
   *   Defaults to `24`.
   * @returns Array of normalized {@link HourlyForecast} entries, ordered
   *   ascending by time.
   */
  getHourly(location: WeatherLocation, hours?: number): Promise<HourlyForecast[]>
}
```

#### `WindReading`

Wind measurement.

```typescript
interface WindReading {
  /**
   * Wind speed in kilometres per hour (km/h).
   */
  speedKmh: number

  /**
   * Wind direction in compass degrees (0 = north, 90 = east, etc.). May be
   * `null` if the upstream provider doesn't report it (e.g. calm conditions).
   */
  directionDeg: number | null

  /**
   * Wind gust speed in kilometres per hour, if reported by the provider.
   */
  gustKmh?: number
}
```

### Types

#### `HourlyForecast`

Hourly forecast entry (one row per forecast hour).

Hourly entries are point-in-time, so they share the field shape with
{@link CurrentWeather}.

```typescript
type HourlyForecast = CurrentWeather
```

### Functions

#### `getCurrent(location)`

Returns the current observed weather for a location, using the bonded
provider.

```typescript
function getCurrent(location: WeatherLocation): Promise<CurrentWeather>
```

- `location` — Latitude/longitude (and optional timezone).

**Returns:** Normalized current weather reading.

#### `getForecast(location, days)`

Returns a daily forecast for a location, using the bonded provider.

```typescript
function getForecast(location: WeatherLocation, days?: number): Promise<DailyForecast[]>
```

- `location` — Latitude/longitude (and optional timezone).
- `days` — Number of forecast days. Defaults to `7`.

**Returns:** Array of normalized daily forecast entries.

#### `getHourly(location, hours)`

Returns an hourly forecast for a location, using the bonded provider.

```typescript
function getHourly(location: WeatherLocation, hours?: number): Promise<CurrentWeather[]>
```

- `location` — Latitude/longitude (and optional timezone).
- `hours` — Number of forecast hours. Defaults to `24`.

**Returns:** Array of normalized hourly forecast entries.

#### `getProvider()`

Retrieves the bonded weather provider, throwing if none is configured.

```typescript
function getProvider(): WeatherProvider
```

**Returns:** The bonded weather provider.

#### `hasProvider()`

Checks whether a weather provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a weather provider is bonded.

#### `setProvider(provider)`

Registers a weather provider as the active singleton. Called by bond
packages (e.g. `@molecule/api-weather-open-meteo`) during application
startup.

```typescript
function setProvider(provider: WeatherProvider): void
```

- `provider` — The weather provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Open-Meteo | `@molecule/api-weather-open-meteo` |
| OpenWeather | `@molecule/api-weather-openweather` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`
