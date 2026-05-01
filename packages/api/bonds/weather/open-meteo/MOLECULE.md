# @molecule/api-weather-open-meteo

Open-Meteo weather provider for molecule.dev.

Implements the `WeatherProvider` interface using the public Open-Meteo
forecast endpoint (`https://api.open-meteo.com/v1/forecast`). Open-Meteo
is keyless, free for non-commercial use, and emits WMO 4677 weather codes
directly, so the provider performs a structural reshape of the response
into the normalized core types — no unit conversion is required.

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

Configuration options for the Open-Meteo weather provider. All fields are
optional because the public endpoint is keyless.

```typescript
interface OpenMeteoWeatherConfig {
  /**
   * Base URL override. Defaults to `'https://api.open-meteo.com/v1'`.
   */
  baseUrl?: string

  /**
   * API key, sent as the `apikey` query parameter. Only required for the
   * commercial customer endpoint.
   */
  apiKey?: string

  /** Request timeout in milliseconds. Defaults to `10000`. */
  timeout?: number

  /**
   * Default IANA timezone used when `WeatherLocation.timezone` is omitted.
   * Defaults to `'auto'`.
   */
  defaultTimezone?: string
}
```

### Functions

#### `createProvider(config?)`

Creates an Open-Meteo weather provider.

```typescript
function createProvider(config?: OpenMeteoWeatherConfig): WeatherProvider
```

- `config` — Provider configuration. All fields optional.

**Returns:** A `WeatherProvider` backed by the Open-Meteo forecast API.

#### `summarizeWmoCode(code)`

Maps a WMO 4677 numeric weather code to a short English summary.

```typescript
function summarizeWmoCode(code: number): string
```

### Constants

#### `provider`

The provider implementation, lazily initialized on first use. Reads
`OPEN_METEO_BASE_URL` and `OPEN_METEO_API_KEY` from environment variables
for optional self-hosted or commercial endpoints.

```typescript
const provider: WeatherProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-weather` ^1.0.0
