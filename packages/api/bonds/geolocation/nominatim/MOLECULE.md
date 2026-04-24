# @molecule/api-geolocation-nominatim

Nominatim (OpenStreetMap) geolocation provider for molecule.dev.

Implements the `GeolocationProvider` interface using the Nominatim API for
geocoding, reverse geocoding, and place search (autocomplete). Distance
calculations use the Haversine formula. Timezone lookups are not supported.

Nominatim is free and open-source but requires a `User-Agent` header per the
usage policy. For production use, consider hosting your own Nominatim instance
and configuring `baseUrl`.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-geolocation'
import { provider } from '@molecule/api-geolocation-nominatim'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-geolocation-nominatim
```

## API

### Interfaces

#### `NominatimGeolocationConfig`

Configuration options for the Nominatim geolocation provider.

```typescript
interface NominatimGeolocationConfig {
  /**
   * A valid HTTP `User-Agent` header identifying the application.
   * Required by the Nominatim Usage Policy for the public instance.
   * Self-hosted instances may not require this.
   */
  userAgent: string

  /** BCP 47 language code for results (e.g., `'en'`, `'fr'`). */
  language?: string

  /** ISO 3166-1 alpha-2 country codes to restrict results to (e.g., `['US', 'CA']`). */
  countryCodes?: string[]

  /** Request timeout in milliseconds. Defaults to `10000`. */
  timeout?: number

  /**
   * Base URL override for self-hosted Nominatim instances.
   * Defaults to `'https://nominatim.openstreetmap.org'`.
   */
  baseUrl?: string

  /**
   * Email address to include in requests (requested by the Nominatim Usage Policy
   * for heavy usage of the public instance).
   */
  email?: string

  /** Maximum number of results to return from search queries. Defaults to `10`. */
  limit?: number
}
```

### Functions

#### `createProvider(config)`

Creates a Nominatim geolocation provider.

```typescript
function createProvider(config: NominatimGeolocationConfig): GeolocationProvider
```

- `config` — Provider configuration including the User-Agent string.

**Returns:** A `GeolocationProvider` backed by the Nominatim API.

### Constants

#### `provider`

The provider implementation, lazily initialized with User-Agent from
`NOMINATIM_USER_AGENT` environment variable (defaults to `'molecule-app'`).

```typescript
const provider: GeolocationProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-geolocation` ^1.0.0
