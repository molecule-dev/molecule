# @molecule/api-geolocation-nominatim

Nominatim (OpenStreetMap) geolocation provider for molecule.dev.

Implements the `GeolocationProvider` interface using the Nominatim API for
geocoding, reverse geocoding, and place search (autocomplete). Distance
calculations use the Haversine formula. Timezone lookups are not supported.

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
npm install @molecule/api-geolocation-nominatim @molecule/api-geolocation
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

The provider implementation, lazily initialized from env:
`NOMINATIM_USER_AGENT` (identifying User-Agent — the `'molecule-app'`
default is not policy-compliant for production), `NOMINATIM_EMAIL`
(usage-policy contact), and `NOMINATIM_BASE_URL` (self-hosted instance).

```typescript
const provider: GeolocationProvider
```

## Core Interface
Implements `@molecule/api-geolocation` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-geolocation'
import { provider } from '@molecule/api-geolocation-nominatim'

export function setupGeolocationNominatim(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-geolocation` ^1.0.0

### Runtime Dependencies

- `@molecule/api-geolocation`

- **The public `nominatim.openstreetmap.org` server enforces a strict usage
  policy: max 1 request/second, no autocomplete-as-you-type, and an
  identifying User-Agent.** Debounce `autocomplete()` aggressively (or
  trigger it on submit, not keystrokes), set `NOMINATIM_USER_AGENT` to a
  string that identifies YOUR app (the `'molecule-app'` default is not
  compliant for production), and set `NOMINATIM_EMAIL` as the policy
  contact. Violations get the app's traffic blocked.
- For production volume, self-host Nominatim and point `NOMINATIM_BASE_URL`
  (or `config.baseUrl`) at it — the public-server limits then don't apply.
- `getTimezone` is not implemented (optional core capability) — feature-
  detect per the core's remarks, or use `@molecule/api-geolocation-google`.
