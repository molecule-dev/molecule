# @molecule/api-geolocation-google

Google Maps geolocation provider for molecule.dev.

Implements the `GeolocationProvider` interface using Google Maps Geocoding,
Places Autocomplete, and Timezone APIs. Supports geocoding, reverse geocoding,
Haversine distance calculations, place autocomplete, and timezone lookups.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-geolocation-google
```

## Usage

```typescript
import { setProvider } from '@molecule/api-geolocation'
import { provider } from '@molecule/api-geolocation-google'

setProvider(provider)
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

The provider implementation, lazily initialized with API key from `GOOGLE_MAPS_API_KEY` environment variable.

```typescript
const provider: GeolocationProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-geolocation` ^1.0.0
