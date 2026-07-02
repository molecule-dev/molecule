# @molecule/api-geolocation-google

Google Maps geolocation provider for molecule.dev.

Implements the `GeolocationProvider` interface using Google Maps Geocoding,
Places Autocomplete, and Timezone APIs. Supports geocoding, reverse geocoding,
Haversine distance calculations, place autocomplete, and timezone lookups.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-geolocation'
import { provider } from '@molecule/api-geolocation-google'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-geolocation-google
```

## API

### Interfaces

#### `GoogleGeolocationConfig`

Configuration options for the Google Maps geolocation provider.

```typescript
interface GoogleGeolocationConfig {
  /** Google Maps API key. Required. */
  apiKey: string

  /** BCP 47 language code for results (e.g., `'en'`, `'fr'`). */
  language?: string

  /** ISO 3166-1 alpha-2 region code to bias results (e.g., `'US'`). */
  region?: string

  /** Request timeout in milliseconds. Defaults to `10000`. */
  timeout?: number

  /** Base URL override for proxied or self-hosted services. Defaults to `'https://maps.googleapis.com'`. */
  baseUrl?: string
}
```

### Functions

#### `createProvider(config)`

Creates a Google Maps geolocation provider.

```typescript
function createProvider(config: GoogleGeolocationConfig): GeolocationProvider
```

- `config` — Provider configuration including the Google Maps API key.

**Returns:** A `GeolocationProvider` backed by Google Maps APIs.

### Constants

#### `provider`

The provider implementation, lazily initialized with API key from
`GOOGLE_MAPS_API_KEY` and an optional base URL override from
`GOOGLE_MAPS_BASE_URL` (for proxying through a credential broker or a
self-hosted/compatible service).

```typescript
const provider: GeolocationProvider
```

## Core Interface
Implements `@molecule/api-geolocation` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-geolocation'
import { provider } from '@molecule/api-geolocation-google'

export function setupGeolocationGoogle(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-geolocation` ^1.0.0

### Environment Variables

- `GOOGLE_MAPS_API_KEY` *(required)* — Google Maps API key
  - Setup: Enable the Maps/Geocoding APIs in Google Cloud Console and create an API key (restrict it to those APIs).
  - Get it here: [https://console.cloud.google.com/google/maps-apis/credentials](https://console.cloud.google.com/google/maps-apis/credentials)
  - Example: `AIza...`
