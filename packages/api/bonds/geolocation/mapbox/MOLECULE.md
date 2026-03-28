# @molecule/api-geolocation-mapbox

Mapbox geolocation provider for molecule.dev.

Implements the `GeolocationProvider` interface using Mapbox Geocoding API v6
and Search Box API v1. Supports geocoding, reverse geocoding, Haversine distance
calculations, and place autocomplete. Timezone lookups are not supported by Mapbox.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-geolocation-mapbox
```

## Usage

```typescript
import { setProvider } from '@molecule/api-geolocation'
import { provider } from '@molecule/api-geolocation-mapbox'

setProvider(provider)
```

## API

### Interfaces

#### `MapboxGeolocationConfig`

Configuration options for the Mapbox geolocation provider.

```typescript
interface MapboxGeolocationConfig {
  /** Mapbox access token. Required. */
  accessToken: string

  /** BCP 47 language code for results (e.g., `'en'`, `'fr'`). */
  language?: string

  /** ISO 3166-1 alpha-2 country code to bias results (e.g., `'US'`). */
  country?: string

  /** Request timeout in milliseconds. Defaults to `10000`. */
  timeout?: number

  /** Base URL override for proxied or self-hosted services. Defaults to `'https://api.mapbox.com'`. */
  baseUrl?: string
}
```

### Functions

#### `createProvider(config)`

Creates a Mapbox geolocation provider.

```typescript
function createProvider(config: MapboxGeolocationConfig): GeolocationProvider
```

- `config` — Provider configuration including the Mapbox access token.

**Returns:** A `GeolocationProvider` backed by Mapbox APIs.

### Constants

#### `provider`

The provider implementation, lazily initialized with access token from `MAPBOX_ACCESS_TOKEN` environment variable.

```typescript
const provider: GeolocationProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-geolocation` ^1.0.0
