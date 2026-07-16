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
npm install @molecule/api-geolocation-google @molecule/api-geolocation @molecule/api-secrets
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

#### `geolocationGoogleSecretDefinitions`

Secret definitions required by the Google geolocation bond.

```typescript
const geolocationGoogleSecretDefinitions: SecretDefinition[]
```

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
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `GOOGLE_MAPS_API_KEY` *(required)* — Google Maps API key
  - Setup: Enable the Geocoding API, Places API, and Time Zone API in Google Cloud Console and create an API key restricted to those three APIs.
  - Get it here: [https://console.cloud.google.com/google/maps-apis/credentials](https://console.cloud.google.com/google/maps-apis/credentials)
  - Example: `AIza...`

### Runtime Dependencies

- `@molecule/api-geolocation`
- `@molecule/api-secrets`

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] A known input resolves to plausibly-correct results: a real address
  passed to `geocode()` returns coordinates in roughly the right place (a
  famous landmark lands inside its own city, not the middle of the ocean),
  and a known lat/lng passed to `reverseGeocode()` names the right city —
  never an empty array, `null`, `0,0`, or a hardcoded placeholder.
- [ ] The app actually CONSUMES the result downstream, verified on screen:
  the map recenters on the geocoded point, a "near me" list is sorted or
  filtered by `distance()` (closest first), or the address form marks a real
  address valid and a bogus one invalid — a coordinate that comes back but
  changes nothing in the UI is a broken integration, not a pass.
- [ ] If the app relies on the BROWSER geolocation permission, denying it
  (or letting it time out) falls back gracefully to manual entry — type or
  autocomplete an address — never a blank map, a spinner that never
  resolves, or a crash.
- [ ] An unresolvable input (gibberish address, empty `geocode()`/
  `reverseGeocode()` result) surfaces a clear "location not found" message,
  not a crash, a silent blank screen, or a default location shown as if real.
- [ ] PRIVACY: a user's precise coordinates are not exposed to other users
  or written to logs beyond what the feature needs (persist/show only the
  granularity required — e.g. city, not raw lat/lng), and the geocoding
  provider key stays SERVER-SIDE (app screens call YOUR API, never the
  geocoding service directly).
