# @molecule/api-flights-amadeus

Amadeus flights provider for molecule.dev.

Implements the `FlightsProvider` interface against the Amadeus
Self-Service v2 flight-offers and v1 flight-offers pricing endpoints.
Defaults to the test sandbox (`https://test.api.amadeus.com`); set
`AMADEUS_USE_PRODUCTION=true` to route to production.

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

#### `AmadeusFlightOffer`

Raw flight-offer object returned by Amadeus search and pricing
endpoints. Only the fields the provider maps are typed.

```typescript
interface AmadeusFlightOffer {
  type: string
  id: string
  itineraries: AmadeusItinerary[]
  price: { total: string; currency: string; grandTotal?: string }
  travelerPricings?: AmadeusTravelerPricing[]
  [key: string]: unknown
}
```

#### `AmadeusFlightsConfig`

Configuration options for the Amadeus flights provider.

Amadeus exposes a free Self-Service "test" environment at
`https://test.api.amadeus.com` (sandbox data, generous rate limits) and a
paid production environment at `https://api.amadeus.com`. Set
{@link useProduction} (or `AMADEUS_USE_PRODUCTION=true` env var) to
switch.

```typescript
interface AmadeusFlightsConfig {
  /**
   * Amadeus API client id (a.k.a. API Key). Falls back to
   * `AMADEUS_CLIENT_ID` env var if omitted.
   */
  clientId?: string

  /**
   * Amadeus API client secret. Falls back to `AMADEUS_CLIENT_SECRET` env
   * var if omitted.
   */
  clientSecret?: string

  /**
   * When `true`, routes requests to the production endpoint
   * (`https://api.amadeus.com`). When `false` or omitted, uses the
   * Self-Service test sandbox (`https://test.api.amadeus.com`).
   */
  useProduction?: boolean

  /**
   * Base URL override. Takes precedence over {@link useProduction}.
   */
  baseUrl?: string

  /**
   * Request timeout in milliseconds. Defaults to `15000`.
   */
  timeout?: number

  /**
   * Maximum number of recently-searched offers to retain in memory for
   * subsequent `getOffer` / `priceOffer` calls. Amadeus requires the
   * original offer payload (not just its id) when pricing, so the
   * provider caches offers by id. Defaults to `1000`.
   */
  offerCacheSize?: number
}
```

### Classes

#### `AmadeusMissingCredentialsError`

Error thrown by the Amadeus provider when no client credentials are
configured.

Never includes any credential value in its message or properties.

#### `AmadeusRateLimitedError`

Error thrown by the Amadeus provider when the upstream API rejects a
request with HTTP 429 (Too Many Requests).

The error never includes the configured client id / secret in its
message or properties.

#### `AmadeusUnknownOfferError`

Error thrown by the Amadeus provider when an offer id is passed to
`getOffer` / `priceOffer` that has not previously been returned from
`searchFlights`.

#### `AmadeusUpstreamError`

Error thrown by the Amadeus provider for any other non-OK upstream
HTTP response.

Never includes the configured client id / secret in its message or
properties.

### Functions

#### `createProvider(config)`

Creates an Amadeus flights provider.

```typescript
function createProvider(config?: AmadeusFlightsConfig): FlightsProvider
```

- `config` — Provider configuration. All fields are optional but

**Returns:** A {@link FlightsProvider} backed by the Amadeus Self-Service
 *   API.

### Constants

#### `MISSING_CREDENTIALS`

Stable error code emitted by the Amadeus provider when neither
`clientId` nor `clientSecret` (nor their env-var fallbacks) are
configured.

```typescript
const MISSING_CREDENTIALS: "MISSING_CREDENTIALS"
```

#### `provider`

The provider implementation, lazily initialized on first use.

Reads `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`,
`AMADEUS_USE_PRODUCTION`, and `AMADEUS_BASE_URL` from environment
variables.

```typescript
const provider: FlightsProvider
```

#### `RATE_LIMITED`

Stable error code emitted by the Amadeus provider when the upstream API
returns HTTP 429 (Too Many Requests).

Catch on this constant rather than parsing error messages — the message
text is for humans only.

```typescript
const RATE_LIMITED: "RATE_LIMITED"
```

#### `UNKNOWN_OFFER`

Stable error code emitted by the Amadeus provider when an offer id is
passed to `getOffer` / `priceOffer` that the provider has not previously
returned from `searchFlights`. Amadeus requires the original offer
payload to price; consumers MUST `searchFlights` before
`getOffer`/`priceOffer`.

```typescript
const UNKNOWN_OFFER: "UNKNOWN_OFFER"
```

#### `UPSTREAM_ERROR`

Stable error code emitted by the Amadeus provider for any other non-OK
upstream HTTP response.

```typescript
const UPSTREAM_ERROR: "UPSTREAM_ERROR"
```

## Core Interface
Implements `@molecule/api-flights` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-flights'
import { provider } from '@molecule/api-flights-amadeus'

export function setupFlightsAmadeus(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-flights` ^1.0.0

### Environment Variables

- `AMADEUS_CLIENT_ID` *(required)* — Amadeus API key
  - Setup: Create an app in Amadeus for Developers (Self-Service) and copy the API Key.
  - Get it here: [https://developers.amadeus.com/my-apps](https://developers.amadeus.com/my-apps)
- `AMADEUS_CLIENT_SECRET` *(required)* — Amadeus API secret
  - Setup: Copy the API Secret from your Amadeus app page.
  - Get it here: [https://developers.amadeus.com/my-apps](https://developers.amadeus.com/my-apps)
