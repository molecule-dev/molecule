# @molecule/api-weather-open-meteo

Open-Meteo weather provider for molecule.dev.

Implements the `WeatherProvider` interface against the public Open-Meteo
forecast endpoint (`https://api.open-meteo.com/v1/forecast`), which is
keyless, free for non-commercial use, and emits WMO 4677 weather codes
directly. Open-Meteo's native units (Celsius, mm, km/h, percent) already
match the core interface, so the provider performs a structural reshape
rather than a unit conversion.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-weather'
import { provider } from '@molecule/api-weather-open-meteo'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-weather-open-meteo
```

## API

### Interfaces

#### `OpenMeteoWeatherConfig`

Configuration options for the Open-Meteo weather provider.

Open-Meteo's public forecast endpoint
(`https://api.open-meteo.com/v1/forecast`) is keyless and free for
non-commercial use, so all fields are optional.

```typescript
interface OpenMeteoWeatherConfig {
  /**
   * Base URL override. Defaults to `'https://api.open-meteo.com/v1'`.
   * Useful for self-hosted Open-Meteo instances or for the commercial
   * `customer-api.open-meteo.com` endpoint.
   */
  baseUrl?: string

  /**
   * API key, sent as the `apikey` query parameter. Only required for the
   * commercial customer endpoint; ignored by the public service.
   */
  apiKey?: string

  /**
   * Request timeout in milliseconds. Defaults to `10000`.
   */
  timeout?: number

  /**
   * Default IANA timezone used when {@link WeatherLocation.timezone} is
   * omitted. Defaults to `'auto'`, which lets Open-Meteo derive the
   * location's local timezone server-side.
   */
  defaultTimezone?: string
}
```

### Functions

#### `createProvider(config)`

Creates an Open-Meteo weather provider.

```typescript
function createProvider(config?: OpenMeteoWeatherConfig): WeatherProvider
```

- `config` — Provider configuration. All fields are optional.

**Returns:** A `WeatherProvider` backed by the Open-Meteo forecast API.

#### `summarizeWmoCode(code)`

Maps a WMO 4677 numeric weather code to a short English summary.

The mapping covers the codes Open-Meteo emits. Unknown codes fall back
to a generic `'Unknown'` label so summary always returns a non-empty
string.

```typescript
function summarizeWmoCode(code: number): string
```

- `code` — WMO 4677 weather code.

**Returns:** Short English summary suitable for developer-facing logs.

### Constants

#### `provider`

The provider implementation, lazily initialized on first use.

Reads `OPEN_METEO_BASE_URL` and `OPEN_METEO_API_KEY` from environment
variables for optional self-hosted or commercial endpoints. The public
Open-Meteo service requires neither.

```typescript
const provider: WeatherProvider
```

## Core Interface
Implements `@molecule/api-weather` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-weather'
import { provider } from '@molecule/api-weather-open-meteo'

export function setupWeatherOpenMeteo(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-weather` ^1.0.0
