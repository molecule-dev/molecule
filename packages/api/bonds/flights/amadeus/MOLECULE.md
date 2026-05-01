# @molecule/api-flights-amadeus

Amadeus flights provider for molecule.dev.

Implements the `FlightsProvider` interface against the Amadeus
Self-Service v2 flight-offers and v1 flight-offers pricing endpoints.
Defaults to the test sandbox (`https://test.api.amadeus.com`); set
`AMADEUS_USE_PRODUCTION=true` (or `useProduction: true`) to route to
production (`https://api.amadeus.com`).

Auth is OAuth2 client_credentials. The provider caches the access token
until just before its declared expiry. The Amadeus pricing endpoint
requires the **original** flight-offer payload, so the provider keeps a
bounded LRU cache of offers returned from `searchFlights` and looks them
up on `getOffer` / `priceOffer`. Calling those methods with an id that
has not been searched throws `AmadeusUnknownOfferError`.

The configured `clientId` / `clientSecret` are sent only in the OAuth
body, never logged, and never appear in any error message.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-flights'
import { provider } from '@molecule/api-flights-amadeus'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-flights-amadeus
```

## API

### Interfaces

#### `AmadeusFlightsConfig`

Configuration options for the Amadeus flights provider.

```typescript
interface AmadeusFlightsConfig {
  /** Falls back to AMADEUS_CLIENT_ID env var. */
  clientId?: string
  /** Falls back to AMADEUS_CLIENT_SECRET env var. */
  clientSecret?: string
  /** When true, uses https://api.amadeus.com (production). */
  useProduction?: boolean
  /** Base URL override (takes precedence over useProduction). */
  baseUrl?: string
  /** Request timeout in ms. Defaults to 15000. */
  timeout?: number
  /** Max recently-searched offers retained for getOffer/priceOffer. Defaults to 1000. */
  offerCacheSize?: number
}
```

### Functions

#### `createProvider(config?)`

Creates an Amadeus flights provider.

```typescript
function createProvider(config?: AmadeusFlightsConfig): FlightsProvider
```

### Constants

#### `provider`

The provider implementation, lazily initialized on first use. Reads
`AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, `AMADEUS_USE_PRODUCTION`,
and (optional) `AMADEUS_BASE_URL` from env vars.

```typescript
const provider: FlightsProvider
```

#### `RATE_LIMITED`, `MISSING_CREDENTIALS`, `UNKNOWN_OFFER`, `UPSTREAM_ERROR`

Error-code constants attached to thrown error subclasses
(`AmadeusRateLimitedError`, `AmadeusMissingCredentialsError`,
`AmadeusUnknownOfferError`, `AmadeusUpstreamError`).

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-flights` ^1.0.0

### Environment Variables

- `AMADEUS_CLIENT_ID` — Amadeus Self-Service API Key.
- `AMADEUS_CLIENT_SECRET` — Amadeus Self-Service API Secret.
- `AMADEUS_USE_PRODUCTION` — set to `'true'` to route to production.
- `AMADEUS_BASE_URL` — optional base URL override.

Free Self-Service test sandbox signup:
https://developers.amadeus.com/register

### Known Limitations

- `getOffer` and `priceOffer` require a prior `searchFlights` call within
  the same provider instance — Amadeus prices on the original offer
  payload, not the offer id. Throws `AmadeusUnknownOfferError` for
  uncached ids.
- The Self-Service test sandbox returns synthetic data. Use
  `useProduction: true` for real availability + fares.
