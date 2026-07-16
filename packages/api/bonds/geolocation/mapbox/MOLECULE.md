# @molecule/api-geolocation-mapbox

Mapbox geolocation provider for molecule.dev.

Implements the `GeolocationProvider` interface using Mapbox Geocoding API v6
and Search Box API v1. Supports geocoding, reverse geocoding, Haversine distance
calculations, and place autocomplete. Timezone lookups are not supported by Mapbox.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-geolocation'
import { provider } from '@molecule/api-geolocation-mapbox'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-geolocation-mapbox @molecule/api-geolocation @molecule/api-secrets
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

#### `geolocationMapboxSecretDefinitions`

Secret definitions required by the Mapbox geolocation bond.

```typescript
const geolocationMapboxSecretDefinitions: SecretDefinition[]
```

#### `provider`

The provider implementation, lazily initialized with access token from
`MAPBOX_ACCESS_TOKEN` and an optional base URL override from `MAPBOX_BASE_URL`
(for proxying through a credential broker or a self-hosted/compatible service).

```typescript
const provider: GeolocationProvider
```

## Core Interface
Implements `@molecule/api-geolocation` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-geolocation'
import { provider } from '@molecule/api-geolocation-mapbox'

export function setupGeolocationMapbox(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-geolocation` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `MAPBOX_ACCESS_TOKEN` *(required)* — Mapbox access token
  - Setup: Copy the default public token (or create a scoped one) from your Mapbox account.
  - Get it here: [https://account.mapbox.com/access-tokens/](https://account.mapbox.com/access-tokens/)
  - Example: `pk.ey...`

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
