# @molecule/api-weather-openweather

OpenWeather (One Call API 3.0) weather provider for molecule.dev.

Implements the `WeatherProvider` interface against
`https://api.openweathermap.org/data/3.0/onecall`. Suitable as a
paid-tier production alternative to `@molecule/api-weather-open-meteo`
— same normalized return types, same WMO 4677 weather codes (mapped
from OpenWeather's native condition codes), same metric units.

The provider reads `OPENWEATHER_API_KEY` from the environment by
default. The key is redacted from any propagated error message.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-weather'
import { provider } from '@molecule/api-weather-openweather'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-weather-openweather @molecule/api-secrets @molecule/api-weather
```

## API

### Interfaces

#### `OpenWeatherConfig`

Configuration options for the OpenWeather (One Call API 3.0) provider.

The One Call API endpoint
(`https://api.openweathermap.org/data/3.0/onecall`) requires an API key
issued from the OpenWeather dashboard. The free "One Call by Call" tier
is sufficient for development and most flagship demos.

```typescript
interface OpenWeatherConfig {
  /**
   * Base URL override. Defaults to
   * `'https://api.openweathermap.org/data/3.0'`. Useful for routing
   * traffic through an internal proxy or staging gateway.
   */
  baseUrl?: string

  /**
   * OpenWeather API key, sent as the `appid` query parameter. When
   * omitted, the provider falls back to `process.env.OPENWEATHER_API_KEY`
   * at first request. The active provider MUST have an API key
   * configured before any of its methods are invoked.
   */
  apiKey?: string

  /**
   * Request timeout in milliseconds. Defaults to `10000`.
   */
  timeout?: number
}
```

### Functions

#### `createProvider(config)`

Creates an OpenWeather (One Call API 3.0) weather provider.

```typescript
function createProvider(config?: OpenWeatherConfig): WeatherProvider
```

- `config` — Provider configuration. `apiKey` is required at call time — either via this config or `OPENWEATHER_API_KEY` in the environment.

**Returns:** A `WeatherProvider` backed by OpenWeather One Call 3.0.

#### `owmCodeToWmoCode(owmCode)`

Maps an OpenWeather condition code (the `id` field on
`weather[]`) to its closest WMO 4677 numeric code.

The mapping is intentionally lossy — OpenWeather distinguishes more
intensities and qualifiers than WMO 4677 does — but the chosen WMO
codes preserve the rough character (clear / cloudy / rain / snow /
thunderstorm / fog) so consumers and tests can treat
`@molecule/api-weather-open-meteo` and
`@molecule/api-weather-openweather` interchangeably.

Unknown codes fall through to WMO `0` (clear) which is the safest
default given that "no condition" responses from OpenWeather always
indicate clear sky.

```typescript
function owmCodeToWmoCode(owmCode: number): number
```

- `owmCode` — OpenWeather condition code.

**Returns:** The closest matching WMO 4677 numeric code.

#### `summarizeWmoCode(code)`

Maps a WMO 4677 numeric weather code to a short English summary.

Mirrors the table used in `@molecule/api-weather-open-meteo`
(intentionally — keeping the summaries identical means consumers can
swap providers without observing UI text changes).

```typescript
function summarizeWmoCode(code: number): string
```

- `code` — WMO 4677 weather code.

**Returns:** Short English summary suitable for developer-facing logs.

### Constants

#### `provider`

The provider implementation, lazily initialized on first use.

Reads `OPENWEATHER_API_KEY` (and optionally `OPENWEATHER_BASE_URL`)
from the environment so application code can `bond('weather',
provider)` without writing any glue. If `OPENWEATHER_API_KEY` is
unset, the first method call throws a sanitized error pointing the
developer at the missing variable.

```typescript
const provider: WeatherProvider
```

#### `weatherOpenweatherSecretDefinitions`

Secret definitions required by the OpenWeather weather bond.

```typescript
const weatherOpenweatherSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-weather` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-weather'
import { provider } from '@molecule/api-weather-openweather'

export function setupWeatherOpenweather(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-secrets` ^1.0.0
- `@molecule/api-weather` ^1.0.0

### Environment Variables

- `OPENWEATHER_API_KEY` *(required)* — OpenWeather API key
  - Setup: Sign up at OpenWeatherMap (free tier available) and copy your API key.
  - Get it here: [https://home.openweathermap.org/api_keys](https://home.openweathermap.org/api_keys)

### Runtime Dependencies

- `@molecule/api-secrets`
- `@molecule/api-weather`

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Requesting weather for a real location (`getCurrent`) renders PLAUSIBLE
  current conditions in the UI — a temperature in a sane range (roughly -60
  to 60 °C), a non-empty `summary`/condition, plus the humidity (0–100) and
  wind the widget shows — never null, NaN, "--"/placeholder, or a hardcoded
  constant that never moves. Reload and confirm values track the provider.
- [ ] If a forecast is shown, `getForecast` returns MULTIPLE future days with
  DISTINCT values (min/max temps and codes vary day to day), and `getHourly`
  likewise — not one row repeated N times or every day identical.
- [ ] Changing the location changes the data: fetch two clearly different
  coordinates (e.g. a tropical vs. a polar city) and confirm the rendered
  current + forecast actually differ. Identical output for different lat/lon
  means the location never reached the provider.
- [ ] Units: the core normalizes everything to metric (Celsius, km/h, mm). If
  the UI offers a °F / imperial toggle it is an app-side conversion — flipping
  it must consistently convert EVERY displayed value (current, feels-like,
  forecast min/max, wind) while the fetched data stays metric; no half-
  converted mix (a °C label over an °F number, or wind left in km/h).
- [ ] An unknown place name (if the app geocodes) or out-of-range coordinates
  surfaces a clear "not found" — not a blank widget — and a provider outage or
  rate-limit (429) surfaces a graceful message that leaves the last-known
  reading or an empty state. The app never crashes, spins forever, or shows
  NaN/undefined.
- [ ] The provider API key (if the bonded provider needs one) stays server-
  side — never shipped to the browser or a client bundle — and the weather
  endpoint is not an open unbounded proxy: it accepts only the app's own
  locations, not arbitrary caller-supplied upstream URLs or keys.
